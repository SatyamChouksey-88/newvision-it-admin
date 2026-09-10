import { expect, test } from '@playwright/test';
import { login, openGlobalSearch } from './helpers';

test('global search jumps to an asset detail page', async ({ page }) => {
  await login(page);
  const search = await openGlobalSearch(page);
  await search.fill('AST-PUN');

  const hit = page.getByRole('option').filter({ hasText: 'AST-PUN' }).first();
  await expect(hit).toBeVisible({ timeout: 10_000 });
  await hit.click();

  await expect(page).toHaveURL(/\/assets\/show\/\d+/);
});
