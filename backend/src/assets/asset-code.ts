/**
 * Asset code format: AST-{LOCATION}-{CATEGORY}-{SEQ}
 * e.g. AST-PUN-LAP-0001
 */
const SEQ_WIDTH = 4;

export function formatAssetCode(locationCode: string, categoryCode: string, seq: number): string {
  const loc = sanitize(locationCode);
  const cat = sanitize(categoryCode);
  const seqStr = String(seq).padStart(SEQ_WIDTH, '0');
  return `AST-${loc}-${cat}-${seqStr}`;
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
