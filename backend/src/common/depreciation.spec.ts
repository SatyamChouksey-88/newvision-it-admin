import { straightLineDepreciation } from './depreciation';

describe('straightLineDepreciation', () => {
  it('computes book value over time', () => {
    const purchaseDate = new Date('2020-01-01');
    const asOf = new Date('2022-01-01');
    const r = straightLineDepreciation({
      purchaseCost: 1000,
      salvageValue: 100,
      depreciationYears: 5,
      purchaseDate,
      asOf,
    });
    expect(r.annualDepreciation).toBe(180);
    expect(r.bookValue).toBeCloseTo(640, 0);
  });
});
