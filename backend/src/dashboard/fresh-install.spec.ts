import { describe, expect, it } from '@jest/globals';
import { isFreshInstall } from './fresh-install';

describe('isFreshInstall', () => {
  it('is true only when assets, employees, and locations are all zero', () => {
    expect(isFreshInstall({ assets: 0, employees: 0, locations: 0 })).toBe(true);
  });

  it('is false when any estate data exists (seeded demo or partial setup)', () => {
    expect(isFreshInstall({ assets: 1, employees: 0, locations: 0 })).toBe(false);
    expect(isFreshInstall({ assets: 0, employees: 1, locations: 0 })).toBe(false);
    expect(isFreshInstall({ assets: 0, employees: 0, locations: 1 })).toBe(false);
    expect(isFreshInstall({ assets: 1250, employees: 1180, locations: 3 })).toBe(false);
  });
});
