const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Default alert thresholds, in days before expiry. */
export const WARRANTY_THRESHOLDS = [90, 60, 30] as const;

/** Whole days from `from` until `warrantyEnd` (negative if already expired). Date-only math (UTC). */
export function daysRemaining(warrantyEnd: Date, from: Date = new Date()): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(
    warrantyEnd.getUTCFullYear(),
    warrantyEnd.getUTCMonth(),
    warrantyEnd.getUTCDate(),
  );
  return Math.round((b - a) / MS_PER_DAY);
}

export function isExpired(warrantyEnd: Date, from: Date = new Date()): boolean {
  return daysRemaining(warrantyEnd, from) < 0;
}

export function isExpiringWithin(
  warrantyEnd: Date,
  days: number,
  from: Date = new Date(),
): boolean {
  const d = daysRemaining(warrantyEnd, from);
  return d >= 0 && d <= days;
}

/**
 * Which alert threshold (if any) exactly matches today's days-remaining.
 * The scheduled job runs daily and fires a notification the day an asset hits 90/60/30 days.
 */
export function matchingThreshold(
  warrantyEnd: Date,
  from: Date = new Date(),
  thresholds: readonly number[] = WARRANTY_THRESHOLDS,
): number | null {
  const d = daysRemaining(warrantyEnd, from);
  return thresholds.includes(d) ? d : null;
}

/** Human label for the warranty column. Plain "N days" text, per UI spec. */
export function warrantyLabel(warrantyEnd: Date | null, from: Date = new Date()): string {
  if (!warrantyEnd) {
    return 'No warranty';
  }
  const d = daysRemaining(warrantyEnd, from);
  if (d < 0) {
    return `Expired ${Math.abs(d)} days ago`;
  }
  if (d === 0) {
    return 'Expires today';
  }
  return `${d} days`;
}
