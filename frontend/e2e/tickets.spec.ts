import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Support tickets', () => {
  test('employee raises a blank ticket and a template ticket', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await page.goto('/tickets/create');
    await page.getByRole('combobox', { name: 'Category' }).click();
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', { hasText: 'Software' }).first().click();
    await page.getByLabel('Subject').fill('Cannot open Excel');
    await page.getByLabel('Description').fill('Excel crashes on launch after the last update.');
    await page.getByTestId('submit-ticket').click();
    await expect(page.getByTestId('ticket-number')).toBeVisible({ timeout: 15_000 });

    await page.goto('/tickets/create');
    await page.getByRole('combobox', { name: 'Ticket template' }).click();
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
    await page.getByTestId('submit-ticket').click();
    await expect(page.getByTestId('ticket-number')).toBeVisible({ timeout: 15_000 });
  });

  test('IT queue shows quick views, search, and reports', async ({ page }) => {
    await login(page);
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
    await expect(page.getByTestId('quick-view-unassigned')).toBeVisible();
    await page.getByLabel('Search tickets').fill('Outlook');
    await page.getByLabel('Search tickets').press('Enter');
    await page.getByRole('main').getByRole('link', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket reports' })).toBeVisible();
  });

  test('help articles cover ticketing and manual edit', async ({ page }) => {
    await login(page);
    await page.goto('/help/tickets-raise');
    await expect(page.getByRole('heading', { name: 'Raising a support ticket' })).toBeVisible();
    await expect(page.getByText('Was this helpful?')).toBeVisible();
    await page.goto('/help/notes-manual-edit');
    await expect(page.getByRole('heading', { name: 'Notes, manual correction, and backfilling' })).toBeVisible();
  });

  test('asset notes and manual correction require a reason', async ({ page }) => {
    await login(page);
    await page.goto('/assets');
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/assets\/show\//);
    await expect(page.getByTestId('record-notes')).toBeVisible();
    await page.getByLabel('Note text').fill('Called the vendor, replacement Friday');
    await page.getByTestId('add-note').click();
    await expect(page.getByTestId('record-note').first()).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('manual-edit').click();
    await expect(page.getByLabel('Manual edit reason')).toBeVisible();
  });
});
