import { describe, expect, it } from '@jest/globals';
import { classifyTaxId, GSTIN_RE, gstinEmbedsPan, gstinPanError, PAN_RE } from './gstin-pan';

describe('gstin-pan', () => {
  it('accepts a well-formed GSTIN and PAN that embed each other', () => {
    const gstin = '27ABCDE1234F1Z5';
    const pan = 'ABCDE1234F';
    expect(GSTIN_RE.test(gstin)).toBe(true);
    expect(PAN_RE.test(pan)).toBe(true);
    expect(gstinEmbedsPan(gstin, pan)).toBe(true);
    expect(gstinPanError({ gstin, pan })).toBeNull();
  });

  it('blocks a GSTIN whose embedded PAN does not match', () => {
    expect(gstinPanError({ gstin: '27ABCDE1234F1Z5', pan: 'XXXXX9999X' })).toMatch(/must match the PAN/);
    expect(gstinPanError({ gstin: '27ABCDE1234F1Z5', pan: 'WRONGPAN00A' })).toMatch(/PAN/);
  });

  it('splits a stored taxId into GSTIN and embedded PAN', () => {
    expect(classifyTaxId('27ABCDE1234F1Z5')).toEqual({ gstin: '27ABCDE1234F1Z5', pan: 'ABCDE1234F' });
    expect(classifyTaxId('ABCDE1234F')).toEqual({ gstin: null, pan: 'ABCDE1234F' });
  });
});
