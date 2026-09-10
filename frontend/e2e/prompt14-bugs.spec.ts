import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Prompt 14 bug fixes', () => {
  test('Growth (12 months) API returns a real scale, not a flat zero series', async ({ request }) => {
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
    const max = Math.max(...totals);
    expect(max).toBeGreaterThan(1);
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1]);
    }
  });

  test('assets select-all is a checkbox, not wrapped “Select all assets” text', async ({ page }) => {
    await login(page);
    await page.goto('/assets');
    await expect(page.locator('table').first()).toBeVisible();
    const header = page.locator('thead .ant-table-selection-column').first();
    await expect(header.getByRole('checkbox')).toBeVisible();
    await expect(header).not.toHaveText(/Select all assets/);
  });

  test('MANAGE label is a single muted color and brand logos render', async ({ page }) => {
    await login(page);
    const label = page.getByTestId('sider-manage-label');
    await expect(label).toBeVisible();
    const color = await label.evaluate((el) => getComputedStyle(el).color);
    expect(color).toMatch(/rgb\(100,\s*116,\s*139\)|rgb\(90,\s*90,\s*90\)|#64748b/i);
    await expect(page.locator('img[src*="/brand/"]').first()).toBeVisible();
  });
});
