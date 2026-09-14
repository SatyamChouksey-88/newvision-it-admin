import { describe, expect, it } from '@jest/globals';
import { secretsMatch } from './crypto-secret';

describe('secretsMatch', () => {
  it('accepts equal secrets of any length', () => {
    expect(secretsMatch('abc', 'abc')).toBe(true);
    expect(secretsMatch('longer-secret-value', 'longer-secret-value')).toBe(true);
  });

  it('rejects missing or unequal secrets', () => {
    expect(secretsMatch(undefined, 'x')).toBe(false);
    expect(secretsMatch('x', undefined)).toBe(false);
    expect(secretsMatch('abc', 'abd')).toBe(false);
    expect(secretsMatch('short', 'much-longer')).toBe(false);
  });
});
