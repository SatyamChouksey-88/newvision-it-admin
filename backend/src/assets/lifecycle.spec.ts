import { describe, expect, it } from '@jest/globals';
import { AssetStatus } from '@prisma/client';
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  canTransition,
  InvalidTransitionError,
} from './lifecycle';

describe('asset lifecycle', () => {
  it('allows the canonical happy path available → assigned → under_repair → assigned → retired → disposed', () => {
    expect(canTransition('available', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'under_repair')).toBe(true);
    expect(canTransition('under_repair', 'assigned')).toBe(true);
    expect(canTransition('assigned', 'retired')).toBe(true);
    expect(canTransition('retired', 'disposed')).toBe(true);
  });

  it('permits assigned/under_repair → lost or damaged', () => {
    expect(canTransition('assigned', 'lost')).toBe(true);
    expect(canTransition('assigned', 'damaged')).toBe(true);
    expect(canTransition('under_repair', 'lost')).toBe(true);
    expect(canTransition('under_repair', 'damaged')).toBe(true);
  });

  it('forbids reaching lost/damaged directly from available (per spec)', () => {
    expect(canTransition('available', 'lost')).toBe(false);
    expect(canTransition('available', 'damaged')).toBe(false);
  });

  it('forbids skipping straight from available to disposed', () => {
    expect(canTransition('available', 'disposed')).toBe(false);
  });

  it('treats disposed as terminal', () => {
    expect(ALLOWED_TRANSITIONS.disposed).toEqual([]);
    expect(canTransition('disposed', 'available')).toBe(false);
  });

  it('is idempotent for same-state transitions', () => {
    (Object.keys(ALLOWED_TRANSITIONS) as AssetStatus[]).forEach((s) => {
      expect(canTransition(s, s)).toBe(true);
    });
  });

  it('assertTransition throws InvalidTransitionError on illegal moves', () => {
    expect(() => assertTransition('disposed', 'assigned')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('available', 'disposed')).toThrow(
      /Invalid asset status transition/,
    );
  });

  it('assertTransition passes silently on legal moves', () => {
    expect(() => assertTransition('available', 'assigned')).not.toThrow();
  });
});
