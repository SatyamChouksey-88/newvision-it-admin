import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Accessibility (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  async function assertNoSeriousViolations(page: import('@playwright/test').Page) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['aria-hidden-focus'])
      .analyze();
    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  }

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
});
