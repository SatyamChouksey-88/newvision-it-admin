/** Indian GSTIN / PAN format. Unregistered and foreign vendors skip GSTIN via gstUnregistered. */

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const GST_SEARCH_TAXPAYER_URL = 'https://services.gst.gov.in/services/searchtp';

export function normalizeGstin(value?: string | null): string | null {
  const t = value?.replace(/\s+/g, '').toUpperCase() ?? '';
  return t.length ? t : null;
}

export function normalizePan(value?: string | null): string | null {
  const t = value?.replace(/\s+/g, '').toUpperCase() ?? '';
  return t.length ? t : null;
}

/** Characters 3–12 of a GSTIN are the PAN. */
export function gstinEmbedsPan(gstin: string, pan: string): boolean {
  return gstin.slice(2, 12) === pan;
}

export function classifyTaxId(taxId?: string | null): { gstin: string | null; pan: string | null } {
  const raw = normalizeGstin(taxId);
  if (!raw) return { gstin: null, pan: null };
  if (GSTIN_RE.test(raw)) return { gstin: raw, pan: PAN_RE.test(raw.slice(2, 12)) ? raw.slice(2, 12) : null };
  if (PAN_RE.test(raw)) return { gstin: null, pan: raw };
  return { gstin: null, pan: null };
}

export function gstinPanError(args: {
  gstin?: string | null;
  pan?: string | null;
  gstUnregistered?: boolean;
  country?: string | null;
}): string | null {
  const gstin = normalizeGstin(args.gstin);
  const pan = normalizePan(args.pan);
  const skipGstin = args.gstUnregistered === true || (args.country && args.country.toUpperCase() !== 'IN');
  if (gstin && !GSTIN_RE.test(gstin)) {
    return 'GSTIN must be 15 characters in the standard Indian format';
  }
  if (pan && !PAN_RE.test(pan)) {
    return 'PAN must be 10 characters in the format AAAAA9999A';
  }
  if (!skipGstin && args.country?.toUpperCase() === 'IN' && !gstin && !args.gstUnregistered) {
    // Draft vendors may omit GSTIN; activation (A5) enforces documents. Format only when present.
  }
  if (gstin && pan && !gstinEmbedsPan(gstin, pan)) {
    return 'Characters 3–12 of the GSTIN must match the PAN';
  }
  return null;
}
