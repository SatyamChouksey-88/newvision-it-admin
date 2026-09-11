/**
 * Asset code format: AST-{LOCATION}-{CATEGORY}-{SEQ}
 * e.g. AST-PUN-LAP-0001
 */
const SEQ_WIDTH = 4;

export function formatAssetCode(locationCode: string, categoryCode: string, seq: number): string {
  const seqStr = String(seq).padStart(SEQ_WIDTH, '0');
  return `${assetCodePrefix(locationCode, categoryCode)}${seqStr}`;
}

/** `AST-{LOC}-{CAT}-` — everything before the sequence number. */
export function assetCodePrefix(locationCode: string, categoryCode: string): string {
  return `AST-${sanitize(locationCode)}-${sanitize(categoryCode)}-`;
}

/** Parse a well-formed asset code back into its parts. Returns null if it doesn't match. */
export function parseAssetCode(
  code: string,
): { location: string; category: string; seq: number } | null {
  const m = /^AST-([A-Z0-9]+)-([A-Z0-9]+)-(\d+)$/.exec(code);
  if (!m) {
    return null;
  }
  return { location: m[1], category: m[2], seq: Number(m[3]) };
}

function sanitize(v: string): string {
  return (v || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/** Trim, drop spaces, uppercase. Used for both AST-… and custom sticker codes. */
export function normalizeAssetCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

/** Null if the code is allowed as a unique sticker / AST number. */
export function assetCodeError(code: string): string | null {
  if (code.length < 3) return 'Asset number must be at least 3 characters';
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return 'Asset number can only use letters, digits, and hyphens';
  }
  return null;
}
