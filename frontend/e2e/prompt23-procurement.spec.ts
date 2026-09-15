import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('procurement nav and requisition form fields', async ({ page }) => {
  await login(page);
  await expect(page.getByTestId('sider-procurement-label')).toBeVisible();
  await page.getByRole('link', { name: 'Vendors' }).click();
  await expect(page.getByRole('button', { name: /New vendor/ })).toBeVisible();
  await page.getByRole('link', { name: 'Requisitions' }).click();
  await page.getByRole('button', { name: 'New requisition' }).click();
  await expect(page.getByLabel('Request Title')).toBeVisible();
  await expect(page.getByLabel('Business Requirement')).toBeVisible();
  await expect(page.getByLabel('Proposed Make & Model')).toBeVisible();
  await expect(page.getByText('Commercial / notes')).toBeVisible();
  await expect(page.getByLabel('Expected Procurement Date')).toBeVisible();
  await expect(page.getByLabel('Expected Deployment Date')).toBeVisible();
});

test('employees list keeps Active only in the Status column', async ({ page }) => {
  await login(page);
  await page.goto('/employees');
  const first = page.locator('table tbody tr.ant-table-row').first();
  await expect(first).toBeVisible({ timeout: 15_000 });
  const nameCell = first.locator('td').first();
  await expect(nameCell.locator('.ant-tag').filter({ hasText: /^Active$/ })).toHaveCount(0);
  const statusHeader = page.locator('table').first().getByRole('columnheader', { name: /Status/ });
  await expect(statusHeader).toBeVisible();
  const statusIdx = await statusHeader.evaluate((el) => {
    const row = el.parentElement;
    if (!row) return -1;
    return [...row.children].indexOf(el);
  });
  expect(statusIdx, 'Status column header').toBeGreaterThanOrEqual(0);
  await expect(first.locator('td').nth(statusIdx).locator('.ant-tag').first()).toBeVisible();
});
