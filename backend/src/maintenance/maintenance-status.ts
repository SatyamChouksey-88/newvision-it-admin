import { MaintenanceStatus } from '@prisma/client';

/**
 * Maintenance/repair lifecycle (spec §7):
 *   reported → under_repair → repaired → reassigned
 * plus `cancelled` reachable from `reported`/`under_repair`.
 *
 * The coupled asset status is handled by the service:
 *   - under_repair  → asset becomes `under_repair`
 *   - reassigned    → asset returns to `assigned` (if it still has an assignee) or `available`
 *   - cancelled     → an asset left `under_repair` by this ticket returns to `available`
 */
export const ALLOWED_MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  reported: ['under_repair', 'cancelled'],
  under_repair: ['repaired', 'cancelled'],
  repaired: ['reassigned'],
  reassigned: [],
  cancelled: [],
};

export function canMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): boolean {
  if (from === to) {
    return true; // idempotent no-op
  }
  return ALLOWED_MAINTENANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidMaintenanceTransitionError extends Error {
  constructor(
    public readonly from: MaintenanceStatus,
    public readonly to: MaintenanceStatus,
  ) {
    super(
      `Invalid maintenance status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${
          ALLOWED_MAINTENANCE_TRANSITIONS[from].join(', ') || '(none — terminal state)'
        }.`,
    );
    this.name = 'InvalidMaintenanceTransitionError';
  }
}

export function assertMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): void {
  if (!canMaintenanceTransition(from, to)) {
    throw new InvalidMaintenanceTransitionError(from, to);
  }
}
