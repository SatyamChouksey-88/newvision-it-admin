import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test('IT Admin keeps KPI tiles and shows the My work list', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await expect(page.getByTestId('estate-dashboard')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Total Assets:/ })).toBeVisible();
  await expect(page.getByTestId('my-work')).toBeVisible();
  await expect(page.getByTestId('my-work').getByText('My work')).toBeVisible();
});

test('IT Support home is the My work queue, not estate KPIs', async ({ page }) => {
  await login(page, DEMO_USERS.itSupport);
  await expect(page.getByTestId('support-home')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Queue' })).toBeVisible();
  await expect(page.getByTestId('my-work')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Total Assets:/ })).toHaveCount(0);
});
