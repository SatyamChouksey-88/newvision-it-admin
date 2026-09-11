/** Pad a numeric sequence: PR-000042 */
export function paddedCode(prefix: string, n: number, width = 6): string {
  return `${prefix}-${String(n).padStart(width, '0')}`;
}

export function money(n: number | string | { toString(): string }): number {
  return Math.round(Number(n) * 100) / 100;
}

export function lineTotal(unitCost: number, quantity: number): number {
  return money(unitCost * quantity);
}

export function sumLines(lines: { unitCost: number; quantity: number }[], taxAmount = 0): number {
  return money(lines.reduce((s, l) => s + lineTotal(l.unitCost, l.quantity), 0) + taxAmount);
}

export function maskBank(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, '');
  if (trimmed.length <= 4) return `••••${trimmed}`;
  return `••••${trimmed.slice(-4)}`;
}

export function netDays(terms?: string | null): number {
  const m = /net\s*(\d+)/i.exec(terms ?? '');
  return m ? Number(m[1]) : 30;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
