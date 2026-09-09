import type { Row } from '../import-export/parse';

export const ASSET_CANONICAL_FIELDS = [
  'assetCode',
  'category',
  'brand',
  'model',
  'serialNumber',
  'status',
  'condition',
  'location',
  'department',
  'assignedEmployee',
  'purchaseDate',
  'purchaseCost',
  'warrantyStart',
  'warrantyEnd',
  'vendor',
  'invoiceNo',
] as const;

export const EMPLOYEE_CANONICAL_FIELDS = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'phone',
  'designation',
  'location',
  'department',
  'manager',
  'isActive',
  'dateJoined',
] as const;

export type CanonicalField =
  | (typeof ASSET_CANONICAL_FIELDS)[number]
  | (typeof EMPLOYEE_CANONICAL_FIELDS)[number];

/** sourceHeader → canonical field (empty string = ignore column). */
export type ColumnMapping = Record<string, string>;

const ALIASES: Record<string, string> = {
  loc: 'location',
  locationcode: 'location',
  sitecode: 'location',
  site: 'location',
  categorycode: 'category',
  cat: 'category',
  serial: 'serialNumber',
  serialno: 'serialNumber',
  serialnumber: 'serialNumber',
  assetcode: 'assetCode',
  assetid: 'assetCode',
  employeecode: 'employeeCode',
  empcode: 'employeeCode',
  empno: 'employeeCode',
  first: 'firstName',
  firstname: 'firstName',
  last: 'lastName',
  lastname: 'lastName',
  purchasetdate: 'purchaseDate',
  cost: 'purchaseCost',
  invoiceno: 'invoiceNo',
  invoice: 'invoiceNo',
};

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Suggest a mapping from uploaded headers onto the canonical field list.
 * Exact (normalized) name wins, then known aliases. Unrecognised headers map to ''.
 */
export function suggestMapping(headers: string[], canonical: readonly string[]): ColumnMapping {
  const byNorm = new Map(canonical.map((c) => [normalizeHeader(c), c]));
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const n = normalizeHeader(header);
    mapping[header] = byNorm.get(n) ?? ALIASES[n] ?? '';
  }
  return mapping;
}

/** Rewrite each row so keys are canonical field names. Unmapped columns are dropped. */
export function applyMapping(rows: Row[], mapping: ColumnMapping): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const [source, dest] of Object.entries(mapping)) {
      if (!dest) continue;
      out[dest] = row[source] ?? '';
    }
    return out;
  });
}

export function headersOf(rows: Row[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) set.add(key);
  }
  return Array.from(set);
}
