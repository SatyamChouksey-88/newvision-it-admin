import type { Row } from '../import-export/parse';

export interface DuplicateHit {
  row: number;
  key: string;
  value: string;
  reason: 'in_file' | 'in_system';
}

export interface DuplicateScan {
  hits: DuplicateHit[];
  /** 1-based data-row numbers (header = 1) that should be skipped on commit. */
  skipRows: number[];
}

/**
 * Flag rows whose identity key is already present in the file or in the system.
 * `rowOffset` is the 1-based spreadsheet row of the first data row (usually 2).
 */
export function findDuplicates(
  rows: Row[],
  keyField: string,
  existingValues: Iterable<string>,
  rowOffset = 2,
): DuplicateScan {
  const seen = new Set<string>();
  for (const v of existingValues) {
    const n = normalizeValue(v);
    if (n) seen.add(n);
  }
  const inSystem = new Set(seen);
  const hits: DuplicateHit[] = [];
  const skip = new Set<number>();

  rows.forEach((row, i) => {
    const raw = row[keyField] ?? '';
    const value = normalizeValue(raw);
    if (!value) return;
    const rowNum = i + rowOffset;
    if (inSystem.has(value)) {
      hits.push({ row: rowNum, key: keyField, value: raw, reason: 'in_system' });
      skip.add(rowNum);
    } else if (seen.has(value)) {
      hits.push({ row: rowNum, key: keyField, value: raw, reason: 'in_file' });
      skip.add(rowNum);
    } else {
      seen.add(value);
    }
  });

  return { hits, skipRows: Array.from(skip).sort((a, b) => a - b) };
}

function normalizeValue(v: string): string {
  return v.trim().toLowerCase();
}
