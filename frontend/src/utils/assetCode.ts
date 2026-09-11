/** Client-side helpers for AST-… and custom sticker codes. */

export function normalizeAssetCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

export function assetCodeError(code: string): string | null {
  if (code.length < 3) return 'Asset number must be at least 3 characters';
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return 'Asset number can only use letters, digits, and hyphens';
  }
  return null;
}

export function assetCodePrefixPreview(locationCode?: string, categoryCode?: string): string | null {
  const loc = (locationCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const cat = (categoryCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!loc || !cat) return null;
  return `AST-${loc}-${cat}-####`;
}
