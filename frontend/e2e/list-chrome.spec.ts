import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

const LIST_PATHS = [
  '/assets',
  '/employees',
  '/tickets',
  '/maintenance',
  '/consumables',
  '/requests',
  '/audit-logs',
  '/accessories',
] as const;

async function assertToolbarAboveThead(page: Page) {
  const toolbar = page.locator('.nv-grid-toolbar').first();
  const thead = page.locator('.nv-grid .ant-table-thead').first();
  if (!(await toolbar.isVisible()) || !(await thead.isVisible())) return;
  const tbox = await toolbar.boundingBox();
  const hbox = await thead.boundingBox();
  if (!tbox || !hbox) return;
  expect(tbox.y + tbox.height, 'toolbar must sit above the column header').toBeLessThanOrEqual(
    hbox.y + 2,
  );
}

test.describe('List-page chrome', () => {
  test('desktop toolbars stay above thead and never show the Ctrl+C sentence', async ({
    page,
  }) => {
    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const path of LIST_PATHS) {
      await page.goto(path);
      await expect(page.getByText('Ctrl+C copies the selected row')).toHaveCount(0);

      if (path === '/tickets') {
        await expect(page.locator('.nv-filter-row').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Export tickets' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Status legend' })).toBeVisible();
        const row = page.locator('.nv-filter-row').first();
        const wrap = await row.evaluate((el) => {
          const s = getComputedStyle(el);
          return { wrap: s.flexWrap, overflowX: s.overflowX };
        });
        expect(wrap.wrap).toBe('nowrap');
        expect(wrap.overflowX).toMatch(/auto|scroll/);
        const filterBox = await row.boundingBox();
        expect(filterBox?.height ?? 99).toBeLessThan(56);
        const toolsBox = await page.locator('.nv-grid-toolbar').first().boundingBox();
        expect(toolsBox?.height ?? 99).toBeLessThan(56);
      }

      if (path === '/accessories') {
        await page.locator('.ant-segmented-item', { hasText: 'Table' }).click();
      }

      await assertToolbarAboveThead(page);
    }

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/tickets');
    await assertToolbarAboveThead(page);
    await expect(page.getByRole('button', { name: 'Export tickets' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/tickets');
    await expect(page.locator('.nv-filter-row').first()).toBeVisible();
    await expect(page.getByText('Ctrl+C copies the selected row')).toHaveCount(0);
  });
});
