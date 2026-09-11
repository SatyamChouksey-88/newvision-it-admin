/** Fields whose change is material — resets the approval chain. */
export const MATERIAL_REQUISITION_FIELDS = [
  'vendorId',
  'vendorFreeText',
  'category',
  'procurementType',
  'taxAmount',
  'totalCost',
  'lineItems',
] as const;

export type MaterialField = (typeof MATERIAL_REQUISITION_FIELDS)[number];

export interface LineSnap {
  product: string;
  unitCost: number;
  quantity: number;
  commercialNotes?: string | null;
  kind?: string;
}

function linesEqual(a: LineSnap[] = [], b: LineSnap[] = []): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i];
    return (
      row.product === other.product &&
      Number(row.unitCost) === Number(other.unitCost) &&
      Number(row.quantity) === Number(other.quantity) &&
      (row.commercialNotes ?? '') === (other.commercialNotes ?? '') &&
      (row.kind ?? 'serialized') === (other.kind ?? 'serialized')
    );
  });
}

/**
 * Material vs trivial:
 * - Material: vendor, category, procurement type, tax, total, any line-item change (product/qty/cost/notes/kind).
 * - Trivial: title, business requirement, make/model, budget head, dates, locations, owner.
 * Trivial edits do not increment revision or reset approvers.
 */
export function isMaterialRequisitionEdit(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): boolean {
  if (patch.vendorId !== undefined && Number(patch.vendorId ?? 0) !== Number(before.vendorId ?? 0))
    return true;
  if (
    patch.vendorFreeText !== undefined &&
    String(patch.vendorFreeText ?? '') !== String(before.vendorFreeText ?? '')
  ) {
    return true;
  }
  if (patch.category !== undefined && patch.category !== before.category) return true;
  if (patch.procurementType !== undefined && patch.procurementType !== before.procurementType)
    return true;
  if (patch.taxAmount !== undefined && Number(patch.taxAmount) !== Number(before.taxAmount))
    return true;
  if (patch.totalCost !== undefined && Number(patch.totalCost) !== Number(before.totalCost))
    return true;
  if (patch.lineItems !== undefined) {
    return !linesEqual(before.lineItems as LineSnap[], patch.lineItems as LineSnap[]);
  }
  return false;
}

export const MATERIAL_PO_FIELDS = [
  'deliveryDate',
  'taxAmount',
  'total',
  'lineItems',
  'terms',
] as const;
