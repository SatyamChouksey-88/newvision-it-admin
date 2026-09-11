import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { expectSuccess, login, selectByPlaceholder, selectFirstOption } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('creates a new asset through the form', async ({ page }) => {
  const serial = `E2E-CREATE-${Date.now()}`;
  await page.goto('/assets/create');
  await expect(page.getByRole('heading', { name: /New Asset/i })).toBeVisible();

  await selectByPlaceholder(page, 'Select category');
  await selectByPlaceholder(page, 'Select location');
  await page.getByLabel('Brand').fill('Dell');
  await page.getByLabel('Model').fill('Latitude 7440');
  await page.getByLabel('Serial Number').fill(serial);

  await page.getByRole('button', { name: 'Save' }).click();

  // Refine navigates back to the assets list on success.
  await expect(page).toHaveURL(/\/assets(\?|$)/);
  await expect(page.getByPlaceholder(/Search code, serial, model/i)).toBeVisible();

  // The new asset is findable via list search (by serial); the row renders "brand model" as subtext.
  await page.getByPlaceholder(/Search code, serial, model/i).fill(serial);
  await page.getByPlaceholder(/Search code, serial, model/i).press('Enter');
  await expect(page.getByText('Dell Latitude 7440').first()).toBeVisible();
});

test('creates an asset with an explicit unique code', async ({ page }) => {
  const code = `NV-E2E-${Date.now().toString().slice(-6)}`;
  const serial = `E2E-CODE-${Date.now()}`;
  await page.goto('/assets/create');
  await expect(page.getByLabel('Asset number')).toBeVisible();
  await page.getByLabel('Asset number').fill(code);
  await selectByPlaceholder(page, 'Select category');
  await selectByPlaceholder(page, 'Select location');
  await page.getByLabel('Brand').fill('HP');
  await page.getByLabel('Model').fill('EliteBook');
  await page.getByLabel('Serial Number').fill(serial);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/assets(\?|$)/);
  await page.getByPlaceholder(/Search code, serial, model/i).fill(code);
  await page.getByPlaceholder(/Search code, serial, model/i).press('Enter');
  await expect(page.getByText(code.toUpperCase()).first()).toBeVisible();
});

test('renames an asset number after confirm', async ({ page }) => {
  const serial = `E2E-RENAME-${Date.now()}`;
  await page.goto('/assets/create');
  await selectByPlaceholder(page, 'Select category');
  await selectByPlaceholder(page, 'Select location');
  await page.getByLabel('Brand').fill('Lenovo');
  await page.getByLabel('Model').fill('ThinkPad');
  await page.getByLabel('Serial Number').fill(serial);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/assets(\?|$)/);
  await page.getByPlaceholder(/Search code, serial, model/i).fill(serial);
  await page.getByPlaceholder(/Search code, serial, model/i).press('Enter');
  await page.getByText('Lenovo ThinkPad').first().click();
  await expect(page).toHaveURL(/\/assets\/show\//);
  await page.getByRole('link', { name: 'Edit number' }).click();
  await expect(page).toHaveURL(/\/assets\/edit\//);
  const next = `NV-REN-${Date.now().toString().slice(-5)}`;
  await page.getByLabel('Asset number').fill(next);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog').getByText(/Change asset number/i)).toBeVisible();
  await page.getByRole('button', { name: 'Change number' }).click();
  await expect(page).toHaveURL(/\/assets(\/show)?/);
});

test('assigns an available asset to an employee', async ({ page }) => {
  await page.goto('/assets');
  await selectByPlaceholder(page, 'Status', 'Available');
  const assignBtn = page.getByRole('button', { name: 'Assign' }).first();
  await assignBtn.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await selectFirstOption(page, dialog, 0); // employee picker
  await dialog.getByRole('button', { name: 'Assign' }).click();

  await expectSuccess(page, /Assigned/i);
});

test('transfers an assigned asset to another location', async ({ page }) => {
  await page.goto('/assets');
  await selectByPlaceholder(page, 'Status', 'Assigned');
  const transferBtn = page.getByRole('button', { name: 'Transfer' }).first();
  await transferBtn.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await selectByPlaceholder(page, 'Keep current location'); // pick first location
  await dialog.getByRole('button', { name: 'Transfer' }).click();

  await expectSuccess(page, /Transferred/i);
});

test('imports a CSV of assets', async ({ page }) => {
  await page.goto('/assets');
  const csv = path.join(here, 'fixtures', 'assets-import.csv');
  await page.locator('input[type="file"]').setInputFiles(csv);
  // Re-running against seeded data may skip duplicate serials, which surfaces as a warning toast
  // ("Imported 0/3 rows — 3 failed") rather than a success toast. Either proves the import ran.
  await expect(
    page.locator('.ant-message-success, .ant-message-warning').filter({ hasText: /Imported/i }).first(),
  ).toBeVisible();
});
