import { describe, expect, it } from '@jest/globals';
import { accountHolderMatchesLegal } from './names';

describe('account holder vs legal name', () => {
  it('matches ignoring case and extra spaces', () => {
    expect(accountHolderMatchesLegal('Dell  India Pvt Ltd', 'DELL INDIA PVT LTD')).toBe(true);
    expect(accountHolderMatchesLegal('Dell India', 'Dell Inc')).toBe(false);
  });
});
