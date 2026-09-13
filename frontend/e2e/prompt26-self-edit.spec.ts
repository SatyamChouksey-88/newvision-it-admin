import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Prompt 26 — employee self-service', () => {
  test('employee can edit their own phone and title', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    const employeeId = await page.evaluate(() => {
      const raw =
        localStorage.getItem('newvision:user') ?? sessionStorage.getItem('newvision:user');
      return raw ? (JSON.parse(raw) as { employeeId?: number }).employeeId : undefined;
    });
    expect(employeeId).toBeTruthy();
    await page.goto(`/employees/show/${employeeId}`);
    await expect(page).toHaveURL(new RegExp(`/employees/show/${employeeId}`));
    await expect(page.getByTestId('employee-profile')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('edit-own-profile')).toBeVisible();
    await page.getByTestId('edit-own-profile').click();
    await page.getByLabel('Phone').fill('020-555-0199');
    await page.getByLabel('Job title').fill('Staff');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(page.getByText('Staff')).toBeVisible();
  });

  test('employee can correct a typo on a ticket they just raised', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await page.goto('/tickets/create');
    await page.getByRole('combobox', { name: 'Category' }).click();
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
        hasText: 'Software',
      })
      .first()
      .click();
    await page.getByLabel('Subject').fill('Cannot open Excl');
    await page.getByLabel('Description').fill('Excel crashes on launch.');
    await page.getByTestId('submit-ticket').click();
    await expect(page.getByTestId('ticket-number')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('edit-own-ticket').click();
    const fix = page.getByRole('dialog', { name: 'Fix subject / description' });
    await expect(fix).toBeVisible();
    await fix.getByRole('textbox', { name: /Subject/ }).fill('Cannot open Excel');
    await fix.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Ticket updated')).toBeVisible();
    await expect(page.getByText('Cannot open Excel')).toBeVisible();
  });
});
