import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { demoLoginsAllowed, isDemoLoginEmail } from '../common/demo-logins';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped } from '../tenancy/context';
import {
  effectiveModules,
  onboardingComplete,
  parseModules,
  type TenantRecord,
} from '../tenancy/plans';

export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ?? 'dev-only-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, employee: { select: { locationId: true } }, tenant: true },
      }),
    );
    if (!user?.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (isDemoLoginEmail(user.email) && !demoLoginsAllowed()) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (
      user.passwordChangedAt &&
      payload.iat &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Session expired. Sign in again.');
    }
    if (!user.tenantId || !user.tenant) {
      throw new UnauthorizedException('User is not attached to a workspace');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      employeeId: user.employeeId,
      locationId: user.employee?.locationId ?? null,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      tenant: toTenantRecord(user.tenant),
    };
  }
}

export function toTenantRecord(row: {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  mailFromName: string | null;
  mailFromAddress: string | null;
  plan: TenantRecord['plan'];
  status: TenantRecord['status'];
  trialEndsAt: Date | null;
  modules: unknown;
  seatCap: number;
  onboarding: unknown;
  activatedAt: Date | null;
  closedAt: Date | null;
}): TenantRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logoUrl,
    mailFromName: row.mailFromName,
    mailFromAddress: row.mailFromAddress,
    plan: row.plan,
    status: row.status,
    trialEndsAt: row.trialEndsAt,
    modules: effectiveModules({
      plan: row.plan,
      status: row.status,
      trialEndsAt: row.trialEndsAt,
      modules: parseModules(row.modules),
    }),
    seatCap: row.seatCap,
    onboarding: row.onboarding,
    onboardingComplete: onboardingComplete(row.onboarding),
    activatedAt: row.activatedAt,
    closedAt: row.closedAt,
  };
}
