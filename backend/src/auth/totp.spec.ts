import { describe, expect, it } from '@jest/globals';
import { generateTotpSecret, otpauthUrl, totpCode, verifyTotp } from './totp';

describe('TOTP', () => {
  it('verifies the current code and rejects a wrong one', () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, '12')).toBe(false);
  });

  it('builds an otpauth URL for authenticator apps', () => {
    const url = otpauthUrl('sara@newvision.local', 'MFRGGZDFMZTWQ2LK');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('secret=MFRGGZDFMZTWQ2LK');
    expect(url).toContain('issuer=NewVision');
  });
});
