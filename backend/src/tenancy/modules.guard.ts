import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { onboardingComplete } from './plans';
import type { TenantRecord } from './plans';

const PROCUREMENT = [
  '/api/vendors',
  '/api/purchase-requisitions',
  '/api/purchase-orders',
  '/api/vendor-contracts',
  '/api/procurement',
];

@Injectable()
export class ModulesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<{
      originalUrl?: string;
      url?: string;
      user?: { tenant?: TenantRecord };
      tenant?: TenantRecord;
    }>();
    const tenant = req.tenant ?? req.user?.tenant;
    if (!tenant) return true;
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const modules = tenant.modules;
    const procurement = PROCUREMENT.some((p) => path === p || path.startsWith(`${p}/`));
    const chat = path === '/api/chat' || path.startsWith('/api/chat/');
    const maintenance = path === '/api/maintenance' || path.startsWith('/api/maintenance/');

    if (procurement && !modules.procurement) {
      throw new ForbiddenException('Procurement is a Team plan module.');
    }
    if (chat && !modules.chat) {
      throw new ForbiddenException('Chat is a Team plan module.');
    }
    if (maintenance && !modules.maintenance) {
      throw new ForbiddenException('Maintenance is a Team plan module.');
    }

    if (
      (procurement || chat) &&
      tenant.status === 'trial' &&
      !onboardingComplete(tenant.onboarding)
    ) {
      throw new ForbiddenException(
        'Finish the welcome checklist (or skip it) before opening procurement or chat.',
      );
    }
    return true;
  }
}
