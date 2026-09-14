export function normalizePersonName(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function accountHolderMatchesLegal(
  accountHolderName?: string | null,
  legalName?: string | null,
): boolean {
  const a = normalizePersonName(accountHolderName);
  const b = normalizePersonName(legalName);
  return Boolean(a && b && a === b);
}
