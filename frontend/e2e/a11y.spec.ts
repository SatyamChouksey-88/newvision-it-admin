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
    await page.waitForLoadState('networkidle');
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on assets list', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    await assertNoSeriousViolations(page);
  });

  test('no serious axe violations on asset detail', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/assets\/show\//);
    await assertNoSeriousViolations(page);
  });
});
