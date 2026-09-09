import { describe, expect, it } from '@jest/globals';
import {
  daysRemaining,
  isExpired,
  isExpiringWithin,
  matchingThreshold,
  warrantyLabel,
} from './warranty';

const from = new Date('2026-01-01T10:00:00Z');

describe('warranty date math', () => {
  it('computes whole days remaining (date-only)', () => {
    expect(daysRemaining(new Date('2026-01-31T00:00:00Z'), from)).toBe(30);
    expect(daysRemaining(new Date('2026-01-01T23:59:00Z'), from)).toBe(0);
  });

  it('returns negative for expired warranties', () => {
    expect(daysRemaining(new Date('2025-12-22T00:00:00Z'), from)).toBe(-10);
    expect(isExpired(new Date('2025-12-31T00:00:00Z'), from)).toBe(true);
    expect(isExpired(new Date('2026-01-02T00:00:00Z'), from)).toBe(false);
  });

  it('isExpiringWithin respects the window and excludes expired', () => {
    expect(isExpiringWithin(new Date('2026-01-20T00:00:00Z'), 30, from)).toBe(true);
    expect(isExpiringWithin(new Date('2026-03-01T00:00:00Z'), 30, from)).toBe(false);
    expect(isExpiringWithin(new Date('2025-12-01T00:00:00Z'), 30, from)).toBe(false);
  });

  it('matchingThreshold fires exactly at 90/60/30 days', () => {
    expect(matchingThreshold(addDays(from, 120), from)).toBeNull();
    expect(matchingThreshold(addDays(from, 90), from)).toBe(90);
    expect(matchingThreshold(addDays(from, 60), from)).toBe(60);
    expect(matchingThreshold(addDays(from, 30), from)).toBe(30);
    expect(matchingThreshold(addDays(from, 45), from)).toBeNull();
  });

  it('warrantyLabel renders plain scannable text', () => {
    expect(warrantyLabel(addDays(from, 12), from)).toBe('12 days');
    expect(warrantyLabel(from, from)).toBe('Expires today');
    expect(warrantyLabel(addDays(from, -5), from)).toBe('Expired 5 days ago');
    expect(warrantyLabel(null, from)).toBe('No warranty');
  });
});

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
