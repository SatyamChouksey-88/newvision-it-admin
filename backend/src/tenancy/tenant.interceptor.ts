import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped, runWithTenant } from './context';
import { effectiveModules, onboardingComplete, trialExpired, type TenantRecord } from './plans';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      tenant?: TenantRecord;
    }>();
    const tenantId = req.user?.tenantId;
    if (!tenantId) return next.handle();

    return from(
      runWithTenant(tenantId, async () => {
        // Tenant is a GLOBAL model — do not nest runUnscoped here (ALS leak).
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant) {
          if (trialExpired(tenant) && tenant.status === 'trial') {
            await this.prisma.tenant.update({
              where: { id: tenantId },
              data: {
                status: 'expired',
                plan: 'starter',
                modules: { procurement: false, chat: false, maintenance: false },
              },
            });
            tenant.status = 'expired';
            tenant.plan = 'starter';
          }
          req.tenant = {
            ...tenant,
            modules: effectiveModules(tenant),
            onboardingComplete: onboardingComplete(tenant.onboarding),
          } as TenantRecord;
          if (req.user) {
            req.user.tenant = req.tenant;
            req.user.tenantSlug = tenant.slug;
          }
        }
        return lastValueFrom(next.handle());
      }),
    );
  }
}

/** Load a tenant without request scoping (signup, cron, health). */
export function loadTenantUnscoped(prisma: PrismaService, id: number) {
  return runUnscoped(() => prisma.tenant.findUnique({ where: { id } }));
}
