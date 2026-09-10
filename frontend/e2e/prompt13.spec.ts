import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

async function mockFreshInstall(page: Page) {
  await page.route('**/api/dashboard/setup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {
        assetCount: 0,
        employeeCount: 0,
        locationCount: 0,
        categoryCount: 0,
        freshInstall: true,
      },
    });
  });
}

async function mockEmptyAssetList(page: Page) {
  await page.route(/\/api\/assets(\?|$)/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    if (/\/api\/assets\/\d+/.test(route.request().url())) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: { data: [], total: 0 },
    });
  });
}

test.describe('Prompt 13 — first-run onboarding', () => {
  test('empty estate shows Welcome to NewVision, not KPI drill-down', async ({ page }) => {
    await mockFreshInstall(page);
    await login(page);
    await expect(page.getByTestId('first-run-welcome')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome to NewVision' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add a location' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Assigned:/ })).toHaveCount(0);
  });

  test('assets list shows the same first-run card when the estate is empty', async ({ page }) => {
    await mockFreshInstall(page);
    await mockEmptyAssetList(page);
    await login(page);
    await page.goto('/assets');
    await expect(page.getByTestId('first-run-welcome')).toBeVisible();
  });

  test('seeded demo dashboard does not show the first-run card', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 3 })).toBeVisible();
    await expect(page.getByTestId('first-run-welcome')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Assigned:/ })).toBeVisible();
  });
});

test.describe('Prompt 13 — large tablet', () => {
  test.use({ viewport: { width: 1000, height: 800 } });

  test('sider collapses to icons between 992px and 1023px', async ({ page }) => {
    await login(page);
    await expect(page.locator('.ant-layout-sider-collapsed').first()).toBeVisible();
    await page.goto('/assets');
    await expect(page.locator('table').first()).toBeVisible();
  });
});

test.describe('Prompt 13 — tablet drawer', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('hamburger drawer frees the canvas and assets table remains usable', async ({ page }) => {
    await login(page);
    await expect(page.locator('.anticon-bars').first()).toBeVisible();
    await page.goto('/assets');
    await expect(page.locator('table').first()).toBeVisible();
  });
});

test.describe('Prompt 13 — light-only', () => {
  test('OS dark preference does not switch the admin chrome to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await login(page);
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'light');
    const bodyBg = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bodyBg).toBe('rgb(248, 250, 252)');
  });
});

test.describe('Prompt 13 — public scan on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('scan card stays inside the viewport', async ({ page, request }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('newvision:token'));
    const list = await request.get('http://localhost:3000/api/assets?_start=0&_end=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const asset = (await list.json()).data[0];
    await page.goto(`/scan/${asset.assetCode}`);
    await expect(page.locator('.nv-scan-page')).toBeVisible();
    await expect(page.getByText('Physical audit')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
