import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { expectSuccess, login, selectByLabel } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('saves the current asset filters as a named view', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/assets');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 20_000 });
  await selectByLabel(page, 'Filter by status', 'Available');

  await page.getByRole('button', { name: 'Save view' }).click();
  const dialog = page.getByRole('dialog', { name: /Save current filters/i });
  await expect(dialog).toBeVisible();
  const viewName = `E2E view ${Date.now()}`;
  const nameField = dialog.getByRole('textbox', { name: 'View name' });
  await nameField.clear();
  await nameField.pressSequentially(viewName, { delay: 15 });
  const submit = dialog.getByRole('button', { name: 'Save view' });
  await expect(submit).toBeEnabled();
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/saved-views') && r.request().method() === 'POST',
    ),
    submit.click(),
  ]);
  expect(res.ok()).toBeTruthy();
  await expectSuccess(page, new RegExp(`Saved view "${viewName}"`));
});

test('dry-runs a mapped import job from Settings', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Import jobs' }).click();
  await expect(page.getByText(/background/i)).toBeVisible();

  const csv = path.join(here, 'fixtures', 'import-job.csv');
  await page.locator('input[type="file"]').first().setInputFiles(csv);
  await expectSuccess(page, /uploaded/i);

  await page.getByRole('button', { name: 'Dry-run preview' }).click();
  await expectSuccess(page, /Dry-run/i);
});

test('reconciles an HR CSV and flags a file-only employee', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Reconciliation' }).click();
  await expect(page.getByText(/Manual upload only/i)).toBeVisible();

  const csv = path.join(here, 'fixtures', 'hr-reconcile.csv');
  await page.locator('input[type="file"]').first().setInputFiles(csv);

  await expect(page.getByText('Only in uploaded file')).toBeVisible();
  await expect(page.getByText('emp-hr-e2e').first()).toBeVisible();
});
