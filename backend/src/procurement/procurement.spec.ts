import { describe, expect, it } from '@jest/globals';
import { overallScore, threeWayMatch } from './match';
import { isMaterialRequisitionEdit } from './material';
import { maskBank, paddedCode, sumLines } from './numbers';

describe('procurement helpers', () => {
  it('pads document numbers', () => {
    expect(paddedCode('PR', 12)).toBe('PR-000012');
  });

  it('masks bank accounts in list views', () => {
    expect(maskBank('123456789012')).toBe('••••9012');
  });

  it('sums line items plus tax', () => {
    expect(
      sumLines(
        [
          { unitCost: 100, quantity: 2 },
          { unitCost: 50, quantity: 1 },
        ],
        10,
      ),
    ).toBe(260);
  });

  it('flags a mismatched invoice as exception and a close match as matched', () => {
    const miss = threeWayMatch({
      poTotal: 1000,
      invoiceAmount: 1500,
      lines: [
        {
          product: 'Laptop',
          orderedQty: 2,
          orderedUnitCost: 500,
          receivedQty: 2,
          invoicedAmount: 1500,
        },
      ],
      tolerancePct: 2,
    });
    expect(miss.status).toBe('exception');
    const ok = threeWayMatch({
      poTotal: 1000,
      invoiceAmount: 1010,
      lines: [
        {
          product: 'Laptop',
          orderedQty: 2,
          orderedUnitCost: 500,
          receivedQty: 2,
          invoicedAmount: 1010,
        },
      ],
      tolerancePct: 2,
    });
    expect(ok.status).toBe('matched');
  });

  it('treats title-only edits as trivial and line/vendor/total changes as material', () => {
    const before = {
      title: 'M365',
      vendorId: 1,
      vendorFreeText: null,
      category: 'Licenses/Software',
      procurementType: 'Licenses',
      taxAmount: 0,
      totalCost: 100,
      lineItems: [
        { product: 'E1', unitCost: 100, quantity: 1, commercialNotes: '', kind: 'license' },
      ],
    };
    expect(isMaterialRequisitionEdit(before, { title: 'M365 E1 licences' })).toBe(false);
    expect(isMaterialRequisitionEdit(before, { businessRequirement: 'typo fix' })).toBe(false);
    expect(isMaterialRequisitionEdit(before, { vendorId: 2 })).toBe(true);
    expect(
      isMaterialRequisitionEdit(before, {
        lineItems: [
          { product: 'E1', unitCost: 100, quantity: 2, commercialNotes: '', kind: 'license' },
        ],
      }),
    ).toBe(true);
  });

  it('weights scorecard KPIs', () => {
    expect(overallScore({ onTime: 100, quality: 100, price: 100, responsiveness: 100 })).toBe(100);
  });
});
