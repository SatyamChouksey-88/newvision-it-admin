/** Default public origin encoded into asset QR codes (frontend scan page). */
export const DEFAULT_PUBLIC_APP_URL = 'http://localhost:5173';

export function publicAppUrl(): string {
  return (process.env.PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, '');
}

/** URL a phone camera opens when scanning an asset sticker. Prefer /scan/:slug/:code for SaaS. */
export function scanPageUrl(
  assetCode: string,
  origin: string = publicAppUrl(),
  tenantSlug?: string,
): string {
  const base = origin.replace(/\/$/, '');
  if (tenantSlug) {
    return `${base}/scan/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(assetCode)}`;
  }
  return `${base}/scan/${encodeURIComponent(assetCode)}`;
}
