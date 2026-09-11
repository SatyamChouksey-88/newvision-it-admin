import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test('logs in as IT Admin and shows the dashboard metric cards', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  // Metric cards from Section 6.
  await expect(page.getByRole('link', { name: /^Total Assets:/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Assigned:/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Available:/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Under Repair:/ })).toBeVisible();
});

test('logs out back to the login screen', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await page.getByTestId('account-menu-button').click();
  await expect(page.getByTestId('account-menu')).toBeVisible();
  await page.getByTestId('account-menu').getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('dialog', { name: 'Sign out?' })).toBeVisible();
  await page.getByRole('button', { name: 'Stay signed in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByTestId('logout-button').first().click();
  await page.getByTestId('logout-confirm').click();
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
