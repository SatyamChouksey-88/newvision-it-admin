import { describe, expect, it } from '@jest/globals';
import { applyMapping, ASSET_CANONICAL_FIELDS, suggestMapping } from './column-map';

describe('column mapping', () => {
  it('suggests exact and aliased headers onto canonical fields', () => {
    const mapping = suggestMapping(
      ['Serial No', 'Location Code', 'Brand', 'Unknown Col'],
      ASSET_CANONICAL_FIELDS,
    );
    expect(mapping['Serial No']).toBe('serialNumber');
    expect(mapping['Location Code']).toBe('location');
    expect(mapping.Brand).toBe('brand');
    expect(mapping['Unknown Col']).toBe('');
  });

  it('rewrites rows to canonical keys and drops unmapped columns', () => {
    const rows = applyMapping(
      [{ 'Serial No': 'SN-1', Extra: 'x', Brand: 'Dell' }],
      { 'Serial No': 'serialNumber', Extra: '', Brand: 'brand' },
    );
    expect(rows).toEqual([{ serialNumber: 'SN-1', brand: 'Dell' }]);
  });
});
