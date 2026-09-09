import { AssetStatus } from '@prisma/client';

/**
 * Valid asset status transitions.
 *
 * Spec lifecycle:
 *   available → assigned → (under_repair | transferred) → assigned/available → retired → disposed
 *   lost/damaged reachable from assigned or under_repair.
 *
 * "transferred" is an action (reassignment) that keeps the asset `assigned`, not a status,
 * so it is not modeled as a distinct state here.
 */
export const ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  // `under_repair` is reachable from `available` too: a spare in storage can need repair
  // before it is ever assigned (Phase 2 maintenance module).
  available: ['assigned', 'pending_assignment', 'under_repair', 'retired'],
  pending_assignment: ['assigned', 'available'],
  assigned: ['available', 'under_repair', 'lost', 'damaged', 'retired'],
  under_repair: ['assigned', 'available', 'lost', 'damaged', 'retired'],
  lost: ['available', 'retired'],
  damaged: ['under_repair', 'available', 'retired'],
  retired: ['disposed'],
  disposed: [],
};

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) {
    return true; // idempotent no-op is allowed
  }
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: AssetStatus,
    public readonly to: AssetStatus,
  ) {
    super(
      `Invalid asset status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${ALLOWED_TRANSITIONS[from].join(', ') || '(none — terminal state)'}.`,
    );
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: AssetStatus, to: AssetStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
