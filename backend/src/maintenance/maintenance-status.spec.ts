import { describe, expect, it } from '@jest/globals';
import {
  assertMaintenanceTransition,
  canMaintenanceTransition,
  InvalidMaintenanceTransitionError,
} from './maintenance-status';

describe('maintenance status lifecycle', () => {
  it('allows the happy path reported → under_repair → repaired → reassigned', () => {
    expect(canMaintenanceTransition('reported', 'under_repair')).toBe(true);
    expect(canMaintenanceTransition('under_repair', 'repaired')).toBe(true);
    expect(canMaintenanceTransition('repaired', 'reassigned')).toBe(true);
  });

  it('allows cancellation from reported and under_repair only', () => {
    expect(canMaintenanceTransition('reported', 'cancelled')).toBe(true);
    expect(canMaintenanceTransition('under_repair', 'cancelled')).toBe(true);
    expect(canMaintenanceTransition('repaired', 'cancelled')).toBe(false);
  });

  it('treats reassigned and cancelled as terminal', () => {
    expect(canMaintenanceTransition('reassigned', 'under_repair')).toBe(false);
    expect(canMaintenanceTransition('cancelled', 'reported')).toBe(false);
  });

  it('rejects skipping straight from reported to repaired', () => {
    expect(canMaintenanceTransition('reported', 'repaired')).toBe(false);
  });

  it('allows an idempotent no-op transition to the same status', () => {
    expect(canMaintenanceTransition('under_repair', 'under_repair')).toBe(true);
  });

  it('assertMaintenanceTransition throws a descriptive error on an invalid move', () => {
    expect(() => assertMaintenanceTransition('reported', 'reassigned')).toThrow(
      InvalidMaintenanceTransitionError,
    );
    try {
      assertMaintenanceTransition('repaired', 'reported');
    } catch (e) {
      expect((e as Error).message).toContain('reported');
    }
  });
});
