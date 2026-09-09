import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('global search jumps to an asset detail page', async ({ page }) => {
  await login(page);
  const search = page.getByPlaceholder(/Search asset code, serial, employee/i);
  await search.fill('AST-PUN');

  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  await dropdown.waitFor({ state: 'visible' });
  await dropdown.locator('.ant-select-item-option').first().click();

  await expect(page).toHaveURL(/\/assets\/show\/\d+/);
});
