export const PROCUREMENT_CATEGORIES = [
  'Hardware',
  'Licenses/Software',
  'Repair Services',
  'Peripherals',
] as const;

export const PROCUREMENT_TYPES = ['Hardware', 'Licenses', 'Services Procurement'] as const;

export const LINE_ITEM_KINDS = ['serialized', 'accessory', 'consumable', 'license'] as const;

/** Quantity and price mismatch allowed before an invoice is flagged Exception. */
export const MATCH_TOLERANCE_PCT = Number(process.env.PROCUREMENT_MATCH_TOLERANCE_PCT ?? 2);

/** Scorecard weights (must sum to 1). */
export const SCORECARD_WEIGHTS = {
  onTime: 0.35,
  quality: 0.3,
  price: 0.2,
  responsiveness: 0.15,
};

export const CONTRACT_RENEWAL_DAYS = [90, 60, 30, 7] as const;

export type ProcurementCategory = (typeof PROCUREMENT_CATEGORIES)[number];
export type ProcurementType = (typeof PROCUREMENT_TYPES)[number];
