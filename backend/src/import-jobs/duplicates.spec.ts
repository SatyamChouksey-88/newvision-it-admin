import { describe, expect, it } from '@jest/globals';
import { findDuplicates } from './duplicates';

describe('duplicate detection', () => {
  it('flags a serial already in the system and a repeat inside the file', () => {
    const scan = findDuplicates(
      [
        { serialNumber: 'SN-A' },
        { serialNumber: 'SN-NEW' },
        { serialNumber: 'sn-new' },
        { serialNumber: '' },
      ],
      'serialNumber',
      ['SN-A'],
    );
    expect(scan.hits).toEqual([
      { row: 2, key: 'serialNumber', value: 'SN-A', reason: 'in_system' },
      { row: 4, key: 'serialNumber', value: 'sn-new', reason: 'in_file' },
    ]);
    expect(scan.skipRows).toEqual([2, 4]);
  });

  it('treats blank identity keys as non-duplicates', () => {
    const scan = findDuplicates([{ serialNumber: '' }, { serialNumber: '   ' }], 'serialNumber', []);
    expect(scan.hits).toEqual([]);
    expect(scan.skipRows).toEqual([]);
  });
});
