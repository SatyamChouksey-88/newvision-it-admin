import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTenantId, runUnscoped, runWithTenant } from './context';
import {
  emptyOnboarding,
  onboardingComplete,
  type OnboardingState,
  trialDaysRemaining,
  TRIAL_DAYS,
} from './plans';

const IT_ROLES = new Set(['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT']);

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(user: AuthUser) {
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    );
    if (!tenant) throw new NotFoundException('Workspace not found');
    const itSeats = await this.prisma.user.count({
      where: { role: { name: { in: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'] } } },
    });
    return {
      ...tenant,
      trialDaysRemaining: trialDaysRemaining(tenant.trialEndsAt),
      trialDays: TRIAL_DAYS,
      itSeats,
      onboardingComplete: onboardingComplete(tenant.onboarding),
    };
  }

  async updateBranding(
    user: AuthUser,
    dto: { name?: string; logoUrl?: string | null; mailFromName?: string; mailFromAddress?: string },
  ) {
    this.assertSuper(user);
    return runUnscoped(() =>
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          name: dto.name?.trim() || undefined,
          logoUrl: dto.logoUrl === undefined ? undefined : dto.logoUrl,
          mailFromName: dto.mailFromName?.trim() || undefined,
          mailFromAddress: dto.mailFromAddress?.trim() || undefined,
        },
      }),
    );
  }

  async patchOnboarding(user: AuthUser, patch: Partial<OnboardingState>) {
    const tenantId = user.tenantId ?? resolveTenantId();
    if (tenantId == null) throw new NotFoundException('Workspace not found');
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    );
    if (!tenant) throw new NotFoundException('Workspace not found');
    const current = { ...emptyOnboarding(), ...(tenant.onboarding as object) };
    const next = { ...current, ...patch };
    await runUnscoped(() =>
      this.prisma.tenant.update({ where: { id: tenantId }, data: { onboarding: next } }),
    );
    return next;
  }

  async markStep(user: AuthUser, step: keyof OnboardingState) {
    return this.patchOnboarding(user, { [step]: true });
  }

  async loadSample(user: AuthUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'IT_ADMIN') {
      throw new BadRequestException('Only IT Admin can load sample data');
    }
    const { loadSampleCompany } = await import('./sample-company');
    await loadSampleCompany(this.prisma, { adminUserId: user.id });
    return this.patchOnboarding(user, {
      importEmployees: true,
      importAssets: true,
      assignedAsset: true,
    });
  }

  async recordProfileOpened(user: AuthUser) {
    if (!IT_ROLES.has(user.role)) return;
    await runUnscoped(() =>
      this.prisma.tenant.updateMany({
        where: { id: user.tenantId, profileOpenedAt: null },
        data: { profileOpenedAt: new Date() },
      }),
    );
    await this.checkA1(user.tenantId);
  }

  async recordAssignment(tenantId: number) {
    await this.checkA1(tenantId);
    await this.markOnboardingFlag(tenantId, 'assignedAsset');
  }

  async recordTicketResolved(tenantId: number, hadPublicReply: boolean) {
    if (!hadPublicReply) return;
    await runUnscoped(async () => {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || tenant.activationA2At) return;
      const now = new Date();
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          activationA2At: now,
          activatedAt: tenant.activatedAt ?? now,
        },
      });
    });
    await this.markOnboardingFlag(tenantId, 'resolvedTicket');
  }

  async recordScan(tenantId: number) {
    await this.markOnboardingFlag(tenantId, 'scannedQr');
  }

  async exportAll(user: AuthUser) {
    this.assertSuper(user);
    const [
      employees,
      assets,
      tickets,
      vendors,
      locations,
      departments,
    ] = await Promise.all([
      this.prisma.employee.findMany(),
      this.prisma.asset.findMany({ include: { category: true, location: true, assignedEmployee: true } }),
      this.prisma.supportTicket.findMany({ include: { category: true } }),
      this.prisma.vendor.findMany(),
      this.prisma.location.findMany(),
      this.prisma.department.findMany(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      tenantId: user.tenantId,
      employees,
      assets,
      tickets,
      vendors,
      locations,
      departments,
    };
  }

  async closeAccount(user: AuthUser, confirmName: string, password: string) {
    this.assertSuper(user);
    const tenant = await runUnscoped(() =>
      this.prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    );
    if (!tenant) throw new NotFoundException('Workspace not found');
    if (confirmName.trim() !== tenant.name) {
      throw new BadRequestException('Type the workspace name to confirm deletion');
    }
    const row = await runUnscoped(() =>
      this.prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
    );
    if (!row || !(await bcrypt.compare(password, row.passwordHash))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    await runUnscoped(() => this.prisma.tenant.delete({ where: { id: user.tenantId } }));
    return { success: true };
  }

  async billing(user: AuthUser) {
    this.assertSuper(user);
    const snap = await this.snapshot(user);
    return {
      tenant: snap.name,
      slug: snap.slug,
      plan: snap.plan,
      status: snap.status,
      trialEndsAt: snap.trialEndsAt,
      trialDaysRemaining: snap.trialDaysRemaining,
      seatCap: snap.seatCap,
      itSeats: snap.itSeats,
    };
  }

  private async checkA1(tenantId: number) {
    await runWithTenant(tenantId, async () => {
      const tenant = await runUnscoped(() =>
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      );
      if (!tenant || tenant.activationA1At) return;
      const assigned = await this.prisma.asset.count({
        where: { assignedEmployeeId: { not: null } },
      });
      if (assigned >= 10 && tenant.profileOpenedAt) {
        const now = new Date();
        await runUnscoped(() =>
          this.prisma.tenant.update({
            where: { id: tenantId },
            data: { activationA1At: now, activatedAt: tenant.activatedAt ?? now },
          }),
        );
      }
    });
  }

  private async markOnboardingFlag(tenantId: number, step: keyof OnboardingState) {
    await runUnscoped(async () => {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return;
      const current = { ...emptyOnboarding(), ...(tenant.onboarding as object) };
      if (current[step]) return;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { onboarding: { ...current, [step]: true } },
      });
    });
  }

  private assertSuper(user: AuthUser) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only the workspace owner can do this');
    }
  }
}

export function csvTemplates() {
  const employees =
    'employeeCode,firstName,lastName,email,phone,designation,location,department\n' +
    'EMP-1001,Rahul,Sharma,rahul.sharma@company.in,9876543210,IT Admin,Pune,Information Technology\n';
  const assets =
    'assetCode,category,brand,model,serialNumber,status,location,assignedEmployee,purchaseDate,warrantyEnd\n' +
    'AST-PUN-LAP-0001,LAP,Dell,Latitude 5440,SN-10001,available,Pune,,2025-04-01,2028-04-01\n';
  return { employees, assets };
}
