import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import * as crypto from 'node:crypto';
import { generators, Issuer, type Client } from 'openid-client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { runUnscoped, runWithTenant } from '../../tenancy/context';
import { AuthService } from '../auth.service';
import { toTenantRecord } from '../jwt.strategy';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  entraApprovedSecurityGroupId,
  entraClientId,
  entraClientSecret,
  entraConfigured,
  entraExpectedTenantId,
  entraIssuerUrl,
  entraJitTenantSlug,
  entraRedirectUri,
  isInitialSuperAdminEmail,
  mockIdpEnabled,
} from './entra-config';
import { MOCK_TENANT_ID } from '../mock-idp/mock-idp-users';

export interface EntraIdentity {
  oid: string;
  email?: string;
  name?: string;
  tid?: string;
  department?: string;
  groups?: string[];
}

/**
 * Phase 2–3 — Microsoft Entra ID (OIDC) client plus JIT user provisioning for the single
 * internal NewVision workspace.
 */
@Injectable()
export class EntraService {
  private readonly logger = new Logger(EntraService.name);
  private clientPromise: Promise<Client> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async client(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const issuerUrl = entraIssuerUrl();
        const issuer = await Issuer.discover(issuerUrl);
        return new issuer.Client({
          client_id: entraClientId(),
          client_secret: entraClientSecret(),
          redirect_uris: [entraRedirectUri()],
          response_types: ['code'],
        });
      })().catch((err) => {
        this.clientPromise = null;
        throw err;
      });
    }
    return this.clientPromise;
  }

  async buildAuthorizationRequest(loginHint?: string) {
    const client = await this.client();
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const url = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...(loginHint ? { login_hint: loginHint } : {}),
    });
    return { url, state, nonce, codeVerifier };
  }

  async handleCallback(
    callbackParams: Record<string, unknown>,
    expected: { state: string; nonce: string; codeVerifier: string },
  ): Promise<EntraIdentity> {
    const client = await this.client();
    let tokenSet: Awaited<ReturnType<Client['callback']>>;
    try {
      tokenSet = await client.callback(entraRedirectUri(), callbackParams, {
        state: expected.state,
        nonce: expected.nonce,
        code_verifier: expected.codeVerifier,
      });
    } catch (err) {
      this.logger.warn(`Entra callback rejected: ${err instanceof Error ? err.message : String(err)}`);
      throw new UnauthorizedException('Microsoft sign-in could not be verified');
    }
    const claims = tokenSet.claims();
    this.assertApprovedTenant(claims.tid as string | undefined);
    const oid = (claims.oid as string | undefined) ?? claims.sub;
    if (!oid) throw new UnauthorizedException('Microsoft did not return an account identifier');
    const groups = this.normalizeGroupsClaim(claims.groups);
    this.assertApprovedGroup(groups);
    return {
      oid,
      email: (claims.email as string | undefined) ?? (claims.preferred_username as string | undefined),
      name: claims.name as string | undefined,
      tid: claims.tid as string | undefined,
      department: claims.department as string | undefined,
      groups,
    };
  }

  private assertApprovedTenant(tid: string | undefined) {
    const expected = entraConfigured()
      ? entraExpectedTenantId()
      : mockIdpEnabled()
        ? MOCK_TENANT_ID
        : undefined;
    if (expected && tid !== expected) {
      this.logger.warn(`Entra callback: tenant mismatch (got ${tid ?? 'none'})`);
      throw new UnauthorizedException('This Microsoft account is not from the approved organization');
    }
  }

  private normalizeGroupsClaim(raw: unknown): string[] | undefined {
    if (!raw) return undefined;
    if (Array.isArray(raw)) return raw.map(String);
    return undefined;
  }

  private assertApprovedGroup(groups: string[] | undefined) {
    const required = entraApprovedSecurityGroupId();
    if (!required) return;
    if (!groups?.includes(required)) {
      this.logger.warn('Entra callback: required security group not present in token');
      throw new UnauthorizedException('This Microsoft account is not eligible for access');
    }
  }

  /** Resolve an active local user by oid, link an existing email match, or JIT-provision. */
  async resolveUserForSignIn(identity: EntraIdentity): Promise<AuthUser> {
    const linked = await this.findLinkedUser(identity.oid);
    if (linked) return linked;

    const email = identity.email?.toLowerCase();
    if (email) {
      const existing = await runUnscoped(() =>
        this.prisma.user.findUnique({
          where: { email },
          include: { role: true, employee: { select: { locationId: true } }, tenant: true },
        }),
      );
      if (existing) {
        if (!existing.isActive) {
          throw new UnauthorizedException('This account has been deactivated');
        }
        if (existing.entraObjectId && existing.entraObjectId !== identity.oid) {
          throw new UnauthorizedException('This email is linked to a different Microsoft account');
        }
        if (!existing.entraObjectId) {
          const bootstrapSuper = isInitialSuperAdminEmail(email);
          const superRole = bootstrapSuper
            ? await runUnscoped(() =>
                this.prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } }),
              )
            : null;
          const updated = await runUnscoped(() =>
            this.prisma.user.update({
              where: { id: existing.id },
              data: {
                entraObjectId: identity.oid,
                entraDepartment: identity.department ?? existing.entraDepartment,
                fullName: identity.name?.trim() || existing.fullName,
                ...(bootstrapSuper && superRole ? { roleId: superRole.id } : {}),
              },
              include: { role: true, employee: { select: { locationId: true } }, tenant: true },
            }),
          );
          await runWithTenant(updated.tenantId, () =>
            this.audit.record({
              entityType: 'User',
              entityId: updated.id,
              action: 'update',
              summary: `Linked Microsoft sign-in to existing account ${updated.email}`,
              changedById: updated.id,
              newValue: { entraObjectId: identity.oid },
            }),
          );
          return this.toAuthUser(updated);
        }
      }
    }

    return this.jitProvisionEmployee(identity);
  }

  async findLinkedUser(oid: string): Promise<AuthUser | null> {
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { entraObjectId: oid },
        include: { role: true, employee: { select: { locationId: true } }, tenant: true },
      }),
    );
    if (!row) return null;
    if (!row.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }
    return this.toAuthUser(row);
  }

  private async jitProvisionEmployee(identity: EntraIdentity): Promise<AuthUser> {
    if (!identity.email) {
      throw new UnauthorizedException('Microsoft did not return an email address for provisioning');
    }
    const email = identity.email.toLowerCase();
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.findFirst({ where: { slug: entraJitTenantSlug() } }),
    );
    if (!tenant) {
      this.logger.error(`JIT tenant slug ${entraJitTenantSlug()} not found`);
      throw new UnauthorizedException('Sign-in is not available yet — contact IT');
    }
    const targetRole = isInitialSuperAdminEmail(email) ? RoleName.SUPER_ADMIN : RoleName.EMPLOYEE;
    const provisionRole = await runUnscoped(() =>
      this.prisma.role.findUnique({ where: { name: targetRole } }),
    );
    if (!provisionRole) {
      throw new UnauthorizedException('Sign-in is not available yet — contact IT');
    }
    const placeholder = crypto.randomBytes(32).toString('hex');
    const passwordHash = await AuthService.hashPassword(placeholder);
    const fullName = identity.name?.trim() || email.split('@')[0];
    try {
      const row = await runUnscoped(() =>
        this.prisma.user.create({
          data: {
            tenantId: tenant.id,
            email,
            fullName,
            passwordHash,
            roleId: provisionRole.id,
            entraObjectId: identity.oid,
            entraDepartment: identity.department ?? null,
            isActive: true,
          },
          include: { role: true, employee: { select: { locationId: true } }, tenant: true },
        }),
      );
      await runWithTenant(row.tenantId, () =>
        this.audit.record({
          entityType: 'User',
          entityId: row.id,
          action: 'create',
          summary: `JIT-provisioned ${targetRole} login for ${row.email} via Microsoft sign-in`,
          changedById: row.id,
          newValue: {
            email: row.email,
            role: targetRole,
            entraObjectId: identity.oid,
            entraDepartment: identity.department,
          },
        }),
      );
      this.logger.log(`JIT provisioned user ${row.email} (oid=${identity.oid})`);
      return this.toAuthUser(row);
    } catch (err) {
      this.logger.warn(
        `JIT provision failed for ${email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Could not create your account — contact IT');
    }
  }

  private toAuthUser(row: {
    id: number;
    email: string;
    fullName: string;
    role: { name: RoleName };
    employeeId: number | null;
    employee: { locationId: number | null } | null;
    tenantId: number;
    tenant: Parameters<typeof toTenantRecord>[0] | null;
  }): AuthUser {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role.name,
      employeeId: row.employeeId,
      locationId: row.employee?.locationId ?? null,
      tenantId: row.tenantId,
      tenantSlug: row.tenant?.slug,
      tenant: row.tenant ? toTenantRecord(row.tenant) : undefined,
      customRoleId: null,
    };
  }
}
