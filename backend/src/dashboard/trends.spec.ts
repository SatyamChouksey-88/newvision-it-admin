import { describe, expect, it } from '@jest/globals';
import { buildTrendPoints, monthKeyUTC, trendWindowStart } from './trends';

describe('buildTrendPoints', () => {
  it('keys months in UTC so IST midnight is not shifted into the previous month', () => {
    const istMidnight = new Date('2026-08-31T18:30:00.000Z');
    expect(monthKeyUTC(istMidnight)).toBe('2026-08');

    const rows = [{ month: '2026-09', count: 1250 }];
    const now = new Date(Date.UTC(2026, 8, 10)); // 10 Sep 2026
    const points = buildTrendPoints(rows, 12, now);
    expect(points).toHaveLength(12);
    expect(points[0].month).toBe('2025-10');
    expect(points[11].month).toBe('2026-09');
    expect(points[11].added).toBe(1250);
    expect(points[11].total).toBe(1250);
    expect(points[11].count).toBe(1250);
    expect(Math.max(...points.map((p) => p.total))).toBe(1250);
  });

  it('zero-fills missing months and coerces bigint counts', () => {
    const now = new Date(Date.UTC(2026, 5, 1));
    const points = buildTrendPoints([{ month: '2026-06', count: 40n as unknown as bigint }], 3, now);
    expect(points.map((p) => p.added)).toEqual([0, 0, 40]);
    expect(points.map((p) => p.total)).toEqual([0, 0, 40]);
  });

  it('carries a baseline and climbs as a cumulative estate total', () => {
    const now = new Date(Date.UTC(2026, 8, 10));
    const points = buildTrendPoints(
      [
        { month: '2026-07', count: 10 },
        { month: '2026-09', count: 5 },
      ],
      3,
      now,
      100,
    );
    expect(points.map((p) => p.month)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(points.map((p) => p.added)).toEqual([10, 0, 5]);
    expect(points.map((p) => p.total)).toEqual([110, 110, 115]);
    expect(points.map((p) => p.count)).toEqual([110, 110, 115]);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].total).toBeGreaterThanOrEqual(points[i - 1].total);
    }
  });

  it('window start is the first UTC day of the earliest month', () => {
    const start = trendWindowStart(12, new Date(Date.UTC(2026, 8, 15)));
    expect(monthKeyUTC(start)).toBe('2025-10');
  });
});
