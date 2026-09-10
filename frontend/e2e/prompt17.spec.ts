import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Prompt 17 / 20 — routes, branding, role homes', () => {
  test('IT Admin home shows status and location tables, not a Growth chart', async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /Dashboard|Estate/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('growth-chart')).toHaveCount(0);
    await expect(page.getByText('Running estate total')).toHaveCount(0);
    await expect(page.getByText('Status distribution')).toBeVisible();
    await expect(page.getByText('Assets by location')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Share' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();
  });

  test('lazy routes render tickets, settings, and help', async ({ page }) => {
    await login(page);
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
    await page.goto('/tickets/create');
    await expect(page.getByText('Raise a ticket').first()).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByText('Your account')).toBeVisible();
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Help & Documentation' })).toBeVisible();
  });

  test('favicon and login wordmark use brand assets', async ({ page }) => {
    await page.goto('/login');
    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute('href', /\/brand\/favicon\.png/);
    await expect(page.locator('img[src="/brand/header-logo.png"]')).toBeVisible();
  });

  test('employee home is My IT, not the estate dashboard', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await expect(page.getByText(/Raise a ticket|My devices|Your devices/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('growth-chart')).toHaveCount(0);
  });
});
