/** Unique vendor invoice numbers, with a Super-Admin-only -CORR correction suffix. */

const CORR_RE = /-CORR(\d+)?$/i;

export function baseInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.trim().replace(CORR_RE, '');
}

/** Next unused correction number: INV-100 → INV-100-CORR, then INV-100-CORR2, … */
export function nextCorrectionNumber(invoiceNumber: string, taken: Iterable<string>): string {
  const base = baseInvoiceNumber(invoiceNumber);
  const used = new Set([...taken].map((n) => n.trim().toLowerCase()));
  let n = 1;
  while (true) {
    const candidate = n === 1 ? `${base}-CORR` : `${base}-CORR${n}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
    n += 1;
  }
}

export function similarInvoiceWindow(invoiceDate: Date, days = 7): { from: Date; to: Date } {
  const from = new Date(invoiceDate);
  from.setUTCDate(from.getUTCDate() - days);
  const to = new Date(invoiceDate);
  to.setUTCDate(to.getUTCDate() + days);
  return { from, to };
}
