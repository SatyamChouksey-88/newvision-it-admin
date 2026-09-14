import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

async function assertNoSeriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // Keep the rule enabled; Ant Design portals historically trap focus with aria-hidden.
    .exclude(['.ant-select-dropdown', '.ant-picker-dropdown', '.ant-dropdown', '.ant-modal-wrap'])
    .analyze();
  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? ''),
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe('Accessibility — login and scan', () => {
  test('no serious axe violations on login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Work email')).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on public scan', async ({ page }) => {
    await login(page);
    const token = await page.evaluate(
      () => sessionStorage.getItem('newvision:token') || localStorage.getItem('newvision:token'),
    );
    const list = await page.request.get('http://localhost:3000/api/assets?_start=0&_end=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const asset = (await list.json()).data[0];
    await page.goto(`/scan/${asset.assetCode}`);
    await expect(page.getByRole('heading', { name: asset.assetCode })).toBeVisible();
    await assertNoSeriousViolations(page);
  });
});

test.describe('Accessibility (IT Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('skip-to-content is first focusable on the authenticated shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('no serious axe violations on dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on assets list', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.locator('table').first()).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on tickets list', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on raise-ticket form', async ({ page }) => {
    await page.goto('/tickets/create');
    await expect(page.getByText('Raise a ticket')).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on asset notes', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.locator('table').first()).toBeVisible();
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/assets\/show\//);
    await expect(page.getByTestId('record-notes')).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on the Help documentation home', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'NewVision documentation' })).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on team chat', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/chat');
    await expect(page.getByTestId('chat-page')).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on a Help article, including the skip link and nav tree', async ({ page }) => {
    await page.goto('/help/getting-started');
    await expect(page.getByRole('heading', { level: 1, name: 'Getting Started' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on procurement vendors', async ({ page }) => {
    await page.goto('/procurement/vendors');
    await expect(page.getByText('Vendors').first()).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText(/Settings|Account|Users/i).first()).toBeVisible();
    await assertNoSeriousViolations(page);
  });
});

test.describe('Accessibility — other roles', () => {
  test('Employee home has no serious axe violations', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await expect(page.getByRole('heading', { name: 'My IT' })).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('Manager home has no serious axe violations', async ({ page }) => {
    await login(page, DEMO_USERS.manager);
    await expect(page.getByRole('heading', { name: 'Your team' })).toBeVisible();
    await assertNoSeriousViolations(page);
    await page.goto('/assets');
    await expect(page.getByText('Team devices').first()).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test('IT Support queue has no serious axe violations', async ({ page }) => {
    await login(page, DEMO_USERS.itSupport);
    await expect(page.getByRole('heading', { name: 'Queue' })).toBeVisible();
    await assertNoSeriousViolations(page);
  });
});
