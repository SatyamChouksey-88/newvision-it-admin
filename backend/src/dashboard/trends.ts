/** UTC YYYY-MM key so Postgres timestamps and JS Date objects line up. */
export function monthKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function trendWindowStart(months: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

export interface TrendPoint {
  month: string;
  label: string;
  /** Assets created in this month. */
  added: number;
  /** Running estate size at month end (includes assets created before the window). */
  total: number;
  /** Alias of `total` so existing clients keep working. */
  count: number;
}

/**
 * Zero-fills the window and carries a cumulative total.
 * `baseline` is the number of assets created before the first month of the window.
 */
export function buildTrendPoints(
  rows: Array<{ month: Date | string; count: number | bigint | string }>,
  months: number,
  now = new Date(),
  baseline = 0,
): TrendPoint[] {
  const start = trendWindowStart(months, now);
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const key =
      typeof r.month === 'string' && /^\d{4}-\d{2}/.test(r.month)
        ? r.month.slice(0, 7)
        : monthKeyUTC(r.month instanceof Date ? r.month : new Date(r.month));
    byMonth.set(key, Number(r.count) || 0);
  }
  const points: TrendPoint[] = [];
  let running = Math.max(0, Number(baseline) || 0);
  for (let i = 0; i < months; i++) {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = monthKeyUTC(cursor);
    const added = byMonth.get(key) ?? 0;
    running += added;
    points.push({
      month: key,
      label: cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      added,
      total: running,
      count: running,
    });
  }
  return points;
}
