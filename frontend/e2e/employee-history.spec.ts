import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Employee profile history', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
  });

  test('shows History tab with timeline events', async ({ page }) => {
    await page.goto('/employees');
    await page.getByLabel('Search employees').fill('EMP-');
    await page.getByLabel('Search employees').press('Enter');
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/employees\/show\//);
    const historyResp = page.waitForResponse(
      (r) => r.url().includes('/employees/') && r.url().includes('/history') && r.status() === 200,
    );
    await page.getByRole('tab', { name: 'History' }).click();
    await historyResp;
    const historyTable = page.getByRole('tabpanel', { name: /History/i }).locator('table tbody');
    await expect(
      historyTable.getByText(/Asset assignment|Asset request|Asset transfer|Maintenance|Accessory/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Dashboard drill-down', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
  });

  test('Assigned metric card navigates to filtered assets list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Assigned:/ }).click();
    await page.waitForURL(/\/assets/);
    await expect(page).toHaveURL(/status.*assigned|filters.*assigned/i);
  });
});
