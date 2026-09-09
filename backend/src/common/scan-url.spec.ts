import { describe, expect, it } from '@jest/globals';
import { DEFAULT_PUBLIC_APP_URL, scanPageUrl } from './scan-url';

describe('scan page URL', () => {
  it('encodes the asset code onto /scan/{code}', () => {
    expect(scanPageUrl('AST-PUN-LAP-0001', 'http://localhost:5173')).toBe(
      'http://localhost:5173/scan/AST-PUN-LAP-0001',
    );
  });

  it('strips a trailing slash on the origin and URI-encodes the code', () => {
    expect(scanPageUrl('AST/odd', 'http://example.test/')).toBe('http://example.test/scan/AST%2Fodd');
  });

  it('defaults to the local Vite origin', () => {
    expect(DEFAULT_PUBLIC_APP_URL).toBe('http://localhost:5173');
  });
});
