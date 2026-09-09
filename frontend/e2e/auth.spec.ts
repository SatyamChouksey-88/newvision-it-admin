import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test('logs in as IT Admin and shows the dashboard metric cards', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  // Metric cards from Section 6.
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
  await expect(page.getByText('Assigned', { exact: true })).toBeVisible();
  await expect(page.getByText('Available', { exact: true })).toBeVisible();
  await expect(page.getByText('Under Repair', { exact: true })).toBeVisible();
});

test('logs out back to the login screen', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await page.getByTestId('logout-button').click();
  await expect(page.locator('#email')).toBeVisible();
});

test('employee role cannot see asset management actions (API-enforced RBAC, hidden in UI)', async ({
  page,
}) => {
  await login(page, DEMO_USERS.employee);
  await page.goto('/assets');
  await expect(page.getByPlaceholder(/Search code, serial, model/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Asset' })).toHaveCount(0);
});
