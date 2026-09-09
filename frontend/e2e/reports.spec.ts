import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('downloads the asset report as CSV', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

  const assetCard = page.locator('.ant-card', { hasText: 'Asset Report' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    assetCard.getByRole('button', { name: 'CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('assets-report.csv');
});

test('downloads the warranty report as PDF', async ({ page }) => {
  await page.goto('/reports');
  const warrantyCard = page.locator('.ant-card', { hasText: 'Warranty Report' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    warrantyCard.getByRole('button', { name: 'PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('warranty-report.pdf');
});
