import { MATCH_TOLERANCE_PCT } from './constants';
import { money } from './numbers';

export interface MatchLine {
  product: string;
  orderedQty: number;
  orderedUnitCost: number;
  receivedQty: number;
  invoicedAmount: number;
}

export interface MatchResult {
  status: 'matched' | 'exception';
  notes: string[];
}

function withinTol(expected: number, actual: number, pct: number): boolean {
  if (expected === 0) return actual === 0;
  return (Math.abs(actual - expected) / expected) * 100 <= pct;
}

/**
 * 3-way match: invoice vs PO totals and cumulative GRN quantities.
 * A small configurable % tolerance applies to quantity and price.
 */
export function threeWayMatch(args: {
  poTotal: number;
  invoiceAmount: number;
  lines: MatchLine[];
  tolerancePct?: number;
}): MatchResult {
  const pct = args.tolerancePct ?? MATCH_TOLERANCE_PCT;
  const notes: string[] = [];

  if (!withinTol(args.poTotal, args.invoiceAmount, pct)) {
    notes.push(
      `Invoice amount ${money(args.invoiceAmount)} differs from PO total ${money(args.poTotal)} by more than ${pct}%.`,
    );
  }

  for (const line of args.lines) {
    if (!withinTol(line.orderedQty, line.receivedQty, pct)) {
      notes.push(
        `${line.product}: received ${line.receivedQty} vs ordered ${line.orderedQty} (tolerance ${pct}%).`,
      );
    }
    const expected = money(line.orderedQty * line.orderedUnitCost);
    if (line.invoicedAmount > 0 && !withinTol(expected, line.invoicedAmount, pct)) {
      notes.push(
        `${line.product}: invoiced ${money(line.invoicedAmount)} vs expected ${expected} (tolerance ${pct}%).`,
      );
    }
    if (line.receivedQty + 1e-9 < line.orderedQty * (1 - pct / 100) && line.invoicedAmount > 0) {
      // already covered by qty check; keep a GRN-vs-invoice signal
      if (line.invoicedAmount > money(line.receivedQty * line.orderedUnitCost) * (1 + pct / 100)) {
        notes.push(`${line.product}: invoiced more than received quantity allows.`);
      }
    }
  }

  return { status: notes.length ? 'exception' : 'matched', notes };
}

export function overallScore(kpis: {
  onTime: number;
  quality: number;
  price: number;
  responsiveness: number;
}): number {
  return money(
    kpis.onTime * 0.35 + kpis.quality * 0.3 + kpis.price * 0.2 + kpis.responsiveness * 0.15,
  );
}
