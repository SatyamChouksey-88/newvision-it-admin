import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Prompt 17 — bundle routes, growth, branding', () => {
  test('Growth chart on the dashboard shows the climbing Total assets series', async ({ page }) => {
    await login(page);
    await expect(page.getByTestId('growth-chart')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Running estate total')).toBeVisible();
    await expect(page.getByTestId('growth-chart').getByText('Total assets')).toBeVisible();
    await expect(page.getByTestId('growth-chart').getByText('Added this month')).toBeVisible();
  });

  test('lazy routes render dashboard, tickets, settings, and help', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
    await page.goto('/tickets/create');
    await expect(page.getByText('Raise a ticket').first()).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByText('Your account')).toBeVisible();
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Help & Documentation' })).toBeVisible();
  });

  test('Growth API is a climbing cumulative total, not isolated additions', async ({ request }) => {
    const loginRes = await request.post('http://localhost:3000/api/auth/login', {
      data: { email: DEMO_USERS.itAdmin, password: 'Password123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { access_token } = await loginRes.json();
    const trends = await request.get('http://localhost:3000/api/dashboard/trends?months=12', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(trends.ok()).toBeTruthy();
    const body = (await trends.json()) as { count: number; total?: number; added?: number }[];
    expect(body.length).toBe(12);
    const totals = body.map((p) => Number(p.total ?? p.count));
    expect(Math.max(...totals)).toBeGreaterThan(1);
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1]);
    }
    expect(totals[totals.length - 1]).toBeGreaterThanOrEqual(totals[0]);
  });

  test('favicon and login wordmark use brand assets', async ({ page }) => {
    await page.goto('/login');
    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute('href', /\/brand\/favicon\.png/);
    await expect(page.locator('img[src="/brand/header-logo.png"]')).toBeVisible();
  });

  test('collapsed sider uses the favicon mark', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('/');
    const mark = page.locator('.nv-brand-img--collapsed, img[src="/brand/favicon.png"]').first();
    await expect(mark).toBeVisible({ timeout: 10_000 });
  });
});
