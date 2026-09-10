/** UTC YYYY-MM key so Postgres timestamps and JS Date objects line up. */
export function monthKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function trendWindowStart(months: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

export function buildTrendPoints(
  rows: Array<{ month: Date | string; count: number | bigint | string }>,
  months: number,
  now = new Date(),
): Array<{ month: string; label: string; count: number }> {
  const start = trendWindowStart(months, now);
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const key =
      typeof r.month === 'string' && /^\d{4}-\d{2}/.test(r.month)
        ? r.month.slice(0, 7)
        : monthKeyUTC(r.month instanceof Date ? r.month : new Date(r.month));
    byMonth.set(key, Number(r.count) || 0);
  }
  const points: { month: string; label: string; count: number }[] = [];
  for (let i = 0; i < months; i++) {
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = monthKeyUTC(cursor);
    points.push({
      month: key,
      label: cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      count: byMonth.get(key) ?? 0,
    });
  }
  return points;
}
