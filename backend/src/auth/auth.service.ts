import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import * as QRCode from 'qrcode';
import { AuditService } from '../audit/audit.service';
import { decryptString, encryptString } from '../common/crypto-secret';
import { demoLoginsAllowed, isDemoLoginEmail } from '../common/demo-logins';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertPasswordStrong } from '../common/password';
import { MailerService } from '../notifications/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped, runWithTenant } from '../tenancy/context';
import { provisionTenant } from '../tenancy/provision';
import type { SignupDto } from './dto/auth-extra.dto';
import { toTenantRecord } from './jwt.strategy';
import { LoginRateLimitService } from './login-rate-limit';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';


const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Precomputed bcrypt of a dummy secret so unknown-user login takes the same path as a miss. */
const DUMMY_PASSWORD_HASH =
  '$2b$10$aQWBj3Ylwrm.2AFNIUoN3uVd/K6U031t6ghvq23.34Mbq12evybZO';

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly rateLimit: LoginRateLimitService,
    private readonly audit: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await runUnscoped(async () =>
      this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { role: true, employee: { select: { locationId: true } }, tenant: true },
      }),
    );
    const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (!user?.isActive || !ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (isDemoLoginEmail(user.email) && !demoLoginsAllowed()) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.toAuthUser(user);
  }

  async login(email: string, password: string, ip: string) {
    this.rateLimit.assertAllowed(ip, email);
    try {
      const user = await this.validateUser(email, password);
      this.rateLimit.recordSuccess(ip, email);
      const mfa = await this.mfaGate(user);
      if (mfa) return mfa;
      await this.recordAuth('login', user.id, user.email, user.id, { ip }, user.tenantId);
      return this.issueTokenPair(user);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        this.rateLimit.recordFailure(ip, email);
        await this.recordAuth('auth_failure', email.toLowerCase(), email, null, { ip });
      }
      throw err;
    }
  }

  /**
   * Issues a fresh access + refresh pair. Two refresh hashes are kept so desktop + phone
   * can stay signed in; a third login replaces the older slot.
   */
  private async issueTokenPair(user: AuthUser, rotateSlot?: 1 | 2) {
    const access_token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    const refresh_token = await this.jwt.signAsync(
      { sub: user.id, jti: randomToken() },
      { secret: this.refreshSecret(), expiresIn: '7d' },
    );
    const refreshTokenHash = await bcrypt.hash(refresh_token, 10);
    const expires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    return runWithTenant(user.tenantId, async () => {
      const slot = rotateSlot ?? (await this.pickRefreshSlot(user.id));
      await this.prisma.user.update({
        where: { id: user.id },
        data:
          slot === 2
            ? { refreshTokenHash2: refreshTokenHash, refreshTokenExpiresAt2: expires }
            : { refreshTokenHash, refreshTokenExpiresAt: expires },
      });
      return { access_token, refresh_token, user };
    });
  }

  private async pickRefreshSlot(userId: number): Promise<1 | 2> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
        refreshTokenHash2: true,
        refreshTokenExpiresAt2: true,
      },
    });
    const now = Date.now();
    const slot1Live =
      Boolean(row?.refreshTokenHash) &&
      Boolean(row?.refreshTokenExpiresAt) &&
      (row?.refreshTokenExpiresAt?.getTime() ?? 0) > now;
    const slot2Live =
      Boolean(row?.refreshTokenHash2) &&
      Boolean(row?.refreshTokenExpiresAt2) &&
      (row?.refreshTokenExpiresAt2?.getTime() ?? 0) > now;
    if (!slot1Live) return 1;
    if (!slot2Live) return 2;
    const t1 = row?.refreshTokenExpiresAt?.getTime() ?? 0;
    const t2 = row?.refreshTokenExpiresAt2?.getTime() ?? 0;
    return t2 <= t1 ? 2 : 1;
  }

  private refreshSecret(): string {
    const dedicated = process.env.JWT_REFRESH_SECRET;
    if (dedicated) return dedicated;
    const access = process.env.JWT_SECRET;
    if (!access) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production');
      }
      return 'dev-only-secret-change-me::refresh';
    }
    return `${access}::refresh`;
  }

  /** Verifies a refresh token (signature + stored hash + expiry) and rotates that slot. */
  async refresh(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, employee: { select: { locationId: true } }, tenant: true },
      }),
    );
    if (!row?.isActive) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }
    if (isDemoLoginEmail(row.email) && !demoLoginsAllowed()) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }
    const now = Date.now();
    const match1 =
      row.refreshTokenHash && row.refreshTokenExpiresAt && row.refreshTokenExpiresAt.getTime() >= now
        ? await bcrypt.compare(refreshToken, row.refreshTokenHash)
        : await bcrypt.compare(refreshToken, DUMMY_PASSWORD_HASH);
    const match2 =
      row.refreshTokenHash2 &&
      row.refreshTokenExpiresAt2 &&
      row.refreshTokenExpiresAt2.getTime() >= now
        ? await bcrypt.compare(refreshToken, row.refreshTokenHash2)
        : await bcrypt.compare(refreshToken, DUMMY_PASSWORD_HASH);
    if (!match1 && !match2) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }
    const user = this.toAuthUser(row);
    return this.issueTokenPair(user, match1 ? 1 : 2);
  }

  async logout(userId: number, email?: string) {
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true, email: true } }),
    );
    await runWithTenant(row?.tenantId ?? 0, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
          refreshTokenHash2: null,
          refreshTokenExpiresAt2: null,
        },
      }),
    );
    await this.recordAuth('logout', userId, email ?? row?.email ?? String(userId), userId, {}, row?.tenantId);
    return { success: true };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await runUnscoped(() => this.prisma.user.findUniqueOrThrow({ where: { id: userId } }));
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await AuthService.hashPassword(newPassword);
    await runWithTenant(user.tenantId, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
          refreshTokenHash2: null,
          refreshTokenExpiresAt2: null,
        },
      }),
    );
    await this.recordAuth('password_change', userId, user.email, userId, {}, user.tenantId);
    return { success: true };
  }

  /** Always returns success (no user enumeration); only sends an email when the address matches. */
  async forgotPassword(email: string, ip: string) {
    this.rateLimit.assertAllowed(ip, email);
    const user = await runUnscoped(() =>
      this.prisma.user.findUnique({ where: { email: email.toLowerCase() } }),
    );
    if (user?.isActive) {
      await this.sendSetPasswordLink(user.id, user.email, {
        subject: 'Reset your NewVision password',
        intro: 'Reset your NewVision password using the link below. It expires in 1 hour.',
      });
    } else {
      this.rateLimit.recordFailure(ip, email);
    }
    return { success: true };
  }

  /**
   * Generates a reset token and emails a set/reset-password link. Shared by self-service
   * "forgot password" and the Super Admin "create a login for this employee" flow (B2/B1) so a
   * new account never needs a temporary password typed/shared out of band.
   */
  async sendSetPasswordLink(
    userId: number,
    email: string,
    copy: { subject: string; intro: string },
  ): Promise<void> {
    const token = randomToken();
    const resetPasswordTokenHash = await bcrypt.hash(token, 10);
    await runUnscoped(() =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          resetPasswordTokenHash,
          resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    );
    const appUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const link = `${appUrl}/reset-password?uid=${userId}&token=${token}`;
    await this.mailer.send({
      to: email,
      subject: copy.subject,
      text: `${copy.intro}\n\n${link}\n\nThis link expires in 1 hour.`,
      html: `<p>${copy.intro}</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  async resetPassword(userId: number, token: string, newPassword: string) {
    const user = await runUnscoped(() => this.prisma.user.findUnique({ where: { id: userId } }));
    if (!user?.resetPasswordTokenHash || !user.resetPasswordExpiresAt) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset link has expired');
    }
    const matches = await bcrypt.compare(token, user.resetPasswordTokenHash);
    if (!matches) throw new BadRequestException('Invalid or expired reset link');
    const passwordHash = await AuthService.hashPassword(newPassword);
    await runWithTenant(user.tenantId, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          resetPasswordTokenHash: null,
          resetPasswordExpiresAt: null,
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
          refreshTokenHash2: null,
          refreshTokenExpiresAt2: null,
        },
      }),
    );
    await this.recordAuth('password_change', userId, user.email, userId, { via: 'reset' }, user.tenantId);
    return { success: true };
  }

  static async hashPassword(plain: string): Promise<string> {
    assertPasswordStrong(plain);
    return bcrypt.hash(plain, 10);
  }

  /** Production Super Admin must enroll TOTP. Tests/dev skip unless REQUIRE_SUPERADMIN_MFA=true. */
  static requireSuperAdminMfa(): boolean {
    if (process.env.REQUIRE_SUPERADMIN_MFA === 'true') return true;
    if (process.env.REQUIRE_SUPERADMIN_MFA === 'false') return false;
    return process.env.NODE_ENV === 'production';
  }

  private async mfaGate(user: AuthUser) {
    if (user.role !== 'SUPER_ADMIN') return null;
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { totpEnabled: true },
      }),
    );
    if (row?.totpEnabled) {
      const token = await this.signMfaToken(user.id);
      return {
        mfaRequired: true as const,
        mfa_token: token,
        mfaToken: token,
      };
    }
    if (AuthService.requireSuperAdminMfa()) {
      return this.beginMfaSetup(user);
    }
    return null;
  }

  async beginMfaSetup(user: AuthUser) {
    const secret = generateTotpSecret();
    await runUnscoped(() =>
      this.prisma.user.update({
        where: { id: user.id },
        data: { totpSecretEnc: encryptString(secret), totpEnabled: false },
      }),
    );
    const url = otpauthUrl(user.email, secret);
    const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
    const token = await this.signMfaToken(user.id);
    return {
      mfaSetupRequired: true as const,
      mfaEnrollRequired: true as const,
      mfa_token: token,
      mfaToken: token,
      secret,
      otpauthUrl: url,
      qrDataUrl,
    };
  }

  async enableMfa(userId: number, code: string) {
    const row = await runUnscoped(() => this.prisma.user.findUniqueOrThrow({ where: { id: userId } }));
    if (!row.totpSecretEnc) {
      throw new BadRequestException('Start authenticator setup first');
    }
    if (!verifyTotp(decryptString(row.totpSecretEnc), code)) {
      throw new BadRequestException('Invalid authenticator code');
    }
    await runWithTenant(row.tenantId, () =>
      this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } }),
    );
    await this.recordAuth('mfa_enroll', userId, row.email, userId, {}, row.tenantId);
    return { success: true, enabled: true, totpEnabled: true };
  }

  async verifyMfa(mfaToken: string, code: string) {
    const userId = await this.verifyMfaToken(mfaToken);
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true, employee: { select: { locationId: true } }, tenant: true },
      }),
    );
    if (!row?.isActive || !row.totpSecretEnc) {
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }
    const secret = decryptString(row.totpSecretEnc);
    if (!verifyTotp(secret, code)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    const enabling = !row.totpEnabled;
    await runWithTenant(row.tenantId, async () => {
      if (enabling) {
        await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
        await this.recordAuth('mfa_enroll', userId, row.email, userId, {}, row.tenantId);
      } else {
        await this.recordAuth('mfa_verify', userId, row.email, userId, {}, row.tenantId);
      }
      await this.recordAuth('login', userId, row.email, userId, { mfa: true }, row.tenantId);
    });
    return this.issueTokenPair(this.toAuthUser(row));
  }

  async mfaStatus(userId: number) {
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { totpEnabled: true, role: true },
      }),
    );
    return {
      enabled: Boolean(row?.totpEnabled),
      totpEnabled: Boolean(row?.totpEnabled),
      required: row?.role.name === 'SUPER_ADMIN' && AuthService.requireSuperAdminMfa(),
    };
  }

  async disableMfa(userId: number, currentPassword: string, code: string) {
    const row = await runUnscoped(() => this.prisma.user.findUniqueOrThrow({ where: { id: userId } }));
    const ok = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    if (!row.totpSecretEnc || !verifyTotp(decryptString(row.totpSecretEnc), code)) {
      throw new BadRequestException('Invalid authenticator code');
    }
    await runWithTenant(row.tenantId, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: { totpEnabled: false, totpSecretEnc: null },
      }),
    );
    return { success: true, enabled: false };
  }

  private async signMfaToken(userId: number): Promise<string> {
    return this.jwt.signAsync({ sub: userId, purpose: 'mfa' }, { expiresIn: '10m' });
  }

  private async verifyMfaToken(token: string): Promise<number> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; purpose?: string }>(token);
      if (payload.purpose !== 'mfa' || !payload.sub) {
        throw new UnauthorizedException('Invalid or expired MFA challenge');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }
  }

  private toAuthUser(user: {
    id: number;
    email: string;
    fullName: string;
    employeeId: number | null;
    tenantId: number;
    role: { name: AuthUser['role'] };
    employee?: { locationId: number } | null;
    tenant?: Parameters<typeof toTenantRecord>[0];
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      employeeId: user.employeeId,
      locationId: user.employee?.locationId ?? null,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug,
      tenant: user.tenant ? toTenantRecord(user.tenant) : undefined,
    };
  }

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await runUnscoped(() => this.prisma.user.findUnique({ where: { email } }));
    if (existing) throw new BadRequestException('That email already has a login');
    const { tenant, user } = await provisionTenant(this.prisma, {
      companyName: dto.companyName.trim(),
      email,
      fullName: dto.fullName.trim(),
      passwordHash: await AuthService.hashPassword(dto.password),
      loadSample: Boolean(dto.loadSample),
    });
    await this.recordAuth('login', user.id, user.email, user.id, { via: 'signup' }, tenant.id);
    const pair = await this.issueTokenPair(this.toAuthUser(user));
    return { ...pair, tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } };
  }

  private async recordAuth(
    action: 'login' | 'logout' | 'auth_failure' | 'password_change' | 'mfa_enroll' | 'mfa_verify',
    entityId: string | number,
    email: string,
    changedById: number | null,
    extra: Record<string, unknown>,
    tenantId?: number,
  ) {
    try {
      const write = () =>
        this.audit.record({
          entityType: 'Auth',
          entityId,
          action,
          summary:
            action === 'login'
              ? `Signed in (${email})`
              : action === 'logout'
                ? `Signed out (${email})`
                : action === 'password_change'
                  ? `Password changed (${email})`
                  : action === 'mfa_enroll'
                    ? `MFA enrolled (${email})`
                    : action === 'mfa_verify'
                      ? `MFA verified (${email})`
                      : `Failed sign-in (${email})`,
          changedById,
          newValue: extra,
        });
      if (tenantId) await runWithTenant(tenantId, write);
      else await runUnscoped(write);
    } catch (e) {
      this.logger.warn(`Auth audit write failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

