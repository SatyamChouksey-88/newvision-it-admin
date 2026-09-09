import type { AssetStatus } from './types';

/**
 * Categorical palette for charts only — separate from UI chrome accent (#2f54eb).
 * Chosen for distinguishability on white backgrounds; not used on buttons/links/text.
 */
export const CHART_PALETTE = [
  '#5470C6',
  '#91CC75',
  '#FAC858',
  '#EE6666',
  '#73C0DE',
  '#3BA272',
  '#FC8452',
  '#9A60B4',
] as const;

/** Consistent status → chart color mapping across dashboard donut and legends. */
export const STATUS_CHART_COLORS: Record<AssetStatus, string> = {
  assigned: '#389e0d',
  available: '#8c8c8c',
  under_repair: '#d46b08',
  retired: '#595959',
  disposed: '#434343',
  lost: '#cf1322',
  damaged: '#eb2f96',
  pending_assignment: '#2f54eb',
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  assigned: 'Assigned',
  available: 'Available',
  under_repair: 'Under repair',
  retired: 'Retired',
  disposed: 'Disposed',
  lost: 'Lost',
  damaged: 'Damaged',
  pending_assignment: 'Pending assignment',
};

/** Import outcome slice colors (created / updated / failed / skipped). */
export const IMPORT_OUTCOME_COLORS = {
  created: '#389e0d',
  updated: '#2f54eb',
  failed: '#cf1322',
  duplicates: '#d46b08',
  skipped: '#8c8c8c',
} as const;

const CODE_LABELS: Record<string, string> = {
  DUPLICATE_IN_FILE: 'Duplicate in file',
  DUPLICATE_IN_SYSTEM: 'Already in system',
  MISSING_REQUIRED: 'Missing required field',
  UNKNOWN_LOCATION: 'Unknown location',
  UNKNOWN_CATEGORY: 'Unknown category',
  UNKNOWN_DEPARTMENT: 'Unknown department',
  UNKNOWN_MANAGER: 'Unknown manager',
  INVALID_VALUE: 'Invalid value',
  DATABASE_CONSTRAINT: 'Database constraint',
  UNKNOWN: 'Other',
};

/** Bucket import row errors by structured `code` from the API (fallback: message heuristics). */
export function categorizeImportErrors(
  errors: { row: number; message: string; code?: string }[],
) {
  const buckets = new Map<string, number>();
  for (const e of errors) {
    let key = 'Other';
    if (e.code && CODE_LABELS[e.code]) {
      key = CODE_LABELS[e.code];
    } else {
      const msg = e.message.toLowerCase();
      key =
        msg.includes('duplicate') || msg.includes('already exists')
          ? 'Duplicate'
          : msg.includes('required') || msg.includes('missing')
            ? 'Missing field'
            : msg.includes('invalid') || msg.includes('must be')
              ? 'Invalid value'
              : 'Other';
    }
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([category, count]) => ({ category, count }));
}
