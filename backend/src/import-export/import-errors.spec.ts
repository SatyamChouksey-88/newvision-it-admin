import { describe, expect, it } from '@jest/globals';
import { classifyImportMessage, ImportErrorCode } from './import-errors';

describe('classifyImportMessage', () => {
  it('maps duplicate messages', () => {
    expect(classifyImportMessage('Duplicate serial already exists')).toBe(
      ImportErrorCode.DUPLICATE_IN_SYSTEM,
    );
  });

  it('maps missing field messages', () => {
    expect(classifyImportMessage('Missing email')).toBe(ImportErrorCode.MISSING_REQUIRED);
  });

  it('maps unknown location', () => {
    expect(classifyImportMessage('Unknown location code "XYZ"')).toBe(
      ImportErrorCode.UNKNOWN_LOCATION,
    );
  });
});
