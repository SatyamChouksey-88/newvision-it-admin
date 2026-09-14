import { describe, expect, it } from '@jest/globals';
import { bankAccountsMatch, normalizeBankDigits, normalizeTaxId, taxIdsMatch } from './vendor-identity';

describe('vendor-identity', () => {
  it('treats GSTIN/PAN as case-insensitive and space-insensitive', () => {
    expect(normalizeTaxId(' 27abcde1234f1z5 ')).toBe('27ABCDE1234F1Z5');
    expect(taxIdsMatch('27ABCDE1234F1Z5', '27abcde1234f1z5')).toBe(true);
    expect(taxIdsMatch('', '27ABCDE1234F1Z5')).toBe(false);
  });

  it('compares bank accounts on digits only', () => {
    expect(normalizeBankDigits('1234 5678 9012')).toBe('123456789012');
    expect(bankAccountsMatch('1234-5678-9012', '123456789012')).toBe(true);
    expect(bankAccountsMatch('12', '99')).toBe(false);
  });
});
