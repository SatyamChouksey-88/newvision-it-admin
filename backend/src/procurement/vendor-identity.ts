/** Duplicate-vendor identity: GSTIN/PAN (today `taxId`) and digit-only bank account. */

export function normalizeTaxId(value?: string | null): string | null {
  const t = value?.replace(/\s+/g, '').toUpperCase() ?? '';
  return t.length ? t : null;
}

export function normalizeBankDigits(value?: string | null): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length ? digits : null;
}

export function taxIdsMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizeTaxId(a);
  const right = normalizeTaxId(b);
  return Boolean(left && right && left === right);
}

export function bankAccountsMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizeBankDigits(a);
  const right = normalizeBankDigits(b);
  return Boolean(left && right && left === right);
}
