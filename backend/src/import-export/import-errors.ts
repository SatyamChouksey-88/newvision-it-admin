import type { Row } from './parse';

/** Structured import failure codes — used by API, tests, and chart bucketing. */
export enum ImportErrorCode {
  DUPLICATE_IN_FILE = 'DUPLICATE_IN_FILE',
  DUPLICATE_IN_SYSTEM = 'DUPLICATE_IN_SYSTEM',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  UNKNOWN_LOCATION = 'UNKNOWN_LOCATION',
  UNKNOWN_CATEGORY = 'UNKNOWN_CATEGORY',
  UNKNOWN_DEPARTMENT = 'UNKNOWN_DEPARTMENT',
  UNKNOWN_MANAGER = 'UNKNOWN_MANAGER',
  INVALID_VALUE = 'INVALID_VALUE',
  DATABASE_CONSTRAINT = 'DATABASE_CONSTRAINT',
  UNKNOWN = 'UNKNOWN',
}

export interface ImportRowError {
  row: number;
  code: ImportErrorCode;
  message: string;
  data?: Row;
}

export function importRowError(
  row: number,
  code: ImportErrorCode,
  message: string,
  data?: Row,
): ImportRowError {
  return { row, code, message, data };
}

/** Map thrown/import messages to stable codes (fallback for unexpected errors). */
export function classifyImportMessage(message: string): ImportErrorCode {
  const m = message.toLowerCase();
  if (m.includes('duplicate') || m.includes('already exists') || m.includes('unique constraint')) {
    return ImportErrorCode.DUPLICATE_IN_SYSTEM;
  }
  if (m.includes('missing')) return ImportErrorCode.MISSING_REQUIRED;
  if (m.includes('unknown location')) return ImportErrorCode.UNKNOWN_LOCATION;
  if (m.includes('unknown category')) return ImportErrorCode.UNKNOWN_CATEGORY;
  if (m.includes('unknown department')) return ImportErrorCode.UNKNOWN_DEPARTMENT;
  if (m.includes('invalid') || m.includes('must be')) return ImportErrorCode.INVALID_VALUE;
  return ImportErrorCode.UNKNOWN;
}

/** Human-readable labels for charts and UI. */
export const IMPORT_ERROR_LABELS: Record<ImportErrorCode, string> = {
  [ImportErrorCode.DUPLICATE_IN_FILE]: 'Duplicate in file',
  [ImportErrorCode.DUPLICATE_IN_SYSTEM]: 'Already in system',
  [ImportErrorCode.MISSING_REQUIRED]: 'Missing required field',
  [ImportErrorCode.UNKNOWN_LOCATION]: 'Unknown location',
  [ImportErrorCode.UNKNOWN_CATEGORY]: 'Unknown category',
  [ImportErrorCode.UNKNOWN_DEPARTMENT]: 'Unknown department',
  [ImportErrorCode.UNKNOWN_MANAGER]: 'Unknown manager',
  [ImportErrorCode.INVALID_VALUE]: 'Invalid value',
  [ImportErrorCode.DATABASE_CONSTRAINT]: 'Database constraint',
  [ImportErrorCode.UNKNOWN]: 'Other',
};
