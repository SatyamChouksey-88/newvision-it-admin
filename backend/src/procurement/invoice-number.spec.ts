import { describe, expect, it } from '@jest/globals';
import { baseInvoiceNumber, nextCorrectionNumber, similarInvoiceWindow } from './invoice-number';

describe('invoice-number', () => {
  it('strips an existing -CORR suffix to the vendor number', () => {
    expect(baseInvoiceNumber('INV-100-CORR')).toBe('INV-100');
    expect(baseInvoiceNumber('INV-100-CORR2')).toBe('INV-100');
    expect(baseInvoiceNumber(' INV-100 ')).toBe('INV-100');
  });

  it('allocates -CORR then -CORR2 when the first correction is taken', () => {
    expect(nextCorrectionNumber('INV-100', ['INV-100'])).toBe('INV-100-CORR');
    expect(nextCorrectionNumber('INV-100', ['INV-100', 'INV-100-CORR'])).toBe('INV-100-CORR2');
    expect(nextCorrectionNumber('INV-100-CORR', ['INV-100', 'INV-100-CORR'])).toBe('INV-100-CORR2');
  });

  it('opens a ±7 day window around the invoice date', () => {
    const { from, to } = similarInvoiceWindow(new Date('2026-09-14T00:00:00.000Z'), 7);
    expect(from.toISOString().slice(0, 10)).toBe('2026-09-07');
    expect(to.toISOString().slice(0, 10)).toBe('2026-09-21');
  });
});
