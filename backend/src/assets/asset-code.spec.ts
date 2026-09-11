import { describe, expect, it } from '@jest/globals';
import {
  assetCodeError,
  assetCodePrefix,
  formatAssetCode,
  normalizeAssetCode,
  parseAssetCode,
} from './asset-code';

describe('asset code generation', () => {
  it('exposes the prefix used to find the next sequence', () => {
    expect(assetCodePrefix('PUN', 'LAP')).toBe('AST-PUN-LAP-');
    expect(formatAssetCode('PUN', 'LAP', 12).startsWith(assetCodePrefix('PUN', 'LAP'))).toBe(true);
  });

  it('formats as AST-{LOCATION}-{CATEGORY}-{SEQ} with 4-digit zero padding', () => {
    expect(formatAssetCode('PUN', 'LAP', 1)).toBe('AST-PUN-LAP-0001');
    expect(formatAssetCode('HYD', 'MON', 42)).toBe('AST-HYD-MON-0042');
    expect(formatAssetCode('BHO', 'SRV', 1234)).toBe('AST-BHO-SRV-1234');
  });

  it('uppercases and strips non-alphanumeric characters from codes', () => {
    expect(formatAssetCode('pun', 'lap', 7)).toBe('AST-PUN-LAP-0007');
    expect(formatAssetCode('p-u.n', 'l a p', 7)).toBe('AST-PUN-LAP-0007');
  });

  it('round-trips through parseAssetCode', () => {
    const code = formatAssetCode('PUN', 'LAP', 25);
    expect(parseAssetCode(code)).toEqual({ location: 'PUN', category: 'LAP', seq: 25 });
  });

  it('returns null for malformed codes', () => {
    expect(parseAssetCode('not-a-code')).toBeNull();
    expect(parseAssetCode('AST-PUN-LAP')).toBeNull();
  });

  it('normalizes custom sticker codes and rejects URL-breaking characters', () => {
    expect(normalizeAssetCode(' nv-lap-1042 ')).toBe('NV-LAP-1042');
    expect(assetCodeError('NV-LAP-1042')).toBeNull();
    expect(assetCodeError('AB')).toMatch(/3 characters/);
    expect(assetCodeError('NV/LAP')).toMatch(/hyphens/);
  });
});
