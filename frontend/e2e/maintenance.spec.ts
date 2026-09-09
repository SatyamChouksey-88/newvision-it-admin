import { expect, test } from '@playwright/test';
import { expectSuccess, login, selectByPlaceholder } from './helpers';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('reports a repair issue and starts the repair', async ({ page }) => {
  await page.goto('/maintenance');
  await expect(page.getByText('Maintenance & Repairs')).toBeVisible();

  await page.getByRole('button', { name: 'Report Issue' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Pick the first available asset and describe the issue.
  await selectByPlaceholder(page, 'Select asset');
  await dialog.getByRole('textbox').first().fill('E2E: intermittent screen flicker');
  await dialog.getByRole('button', { name: 'Report' }).click();

  await expectSuccess(page, /reported/i);

  // The new ticket is the newest row and can be moved into repair.
  const startBtn = page.getByRole('button', { name: 'Start Repair' }).first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();
  await expectSuccess(page, /under repair/i);
});
