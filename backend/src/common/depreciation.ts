/** Straight-line book value from purchase cost, optional salvage, and useful life in years. */
export function straightLineDepreciation(input: {
  purchaseCost: number | null | undefined;
  salvageValue: number | null | undefined;
  depreciationYears: number | null | undefined;
  purchaseDate: Date | null | undefined;
  asOf?: Date;
}): { annualDepreciation: number | null; bookValue: number | null; fullyDepreciated: boolean } {
  const cost = input.purchaseCost;
  const years = input.depreciationYears;
  if (cost == null || years == null || years <= 0) {
    return { annualDepreciation: null, bookValue: null, fullyDepreciated: false };
  }
  const salvage = input.salvageValue ?? 0;
  const depreciable = Math.max(0, cost - salvage);
  const annual = depreciable / years;
  if (!input.purchaseDate) {
    return { annualDepreciation: annual, bookValue: cost, fullyDepreciated: false };
  }
  const asOf = input.asOf ?? new Date();
  const elapsedYears = Math.max(0, (asOf.getTime() - input.purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000));
  const accumulated = Math.min(depreciable, annual * elapsedYears);
  const bookValue = Math.max(salvage, cost - accumulated);
  return {
    annualDepreciation: annual,
    bookValue,
    fullyDepreciated: bookValue <= salvage + 0.01,
  };
}
