import { expect, test } from '@playwright/test';
import { DEMO_USERS, login, selectFirstOption } from './helpers';

test('employee submits request; manager approves; IT marks fulfilled', async ({ page, browser }) => {
  test.setTimeout(90_000);

  await login(page, DEMO_USERS.employee);
  await page.goto('/requests');
  await page.getByRole('button', { name: 'New request' }).click();
  const modal = page.getByRole('dialog');
  await selectFirstOption(page, modal, 1);
  await modal.getByLabel('Reason').fill('Need laptop for new project');
  await modal.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByText('pending').first()).toBeVisible({ timeout: 20_000 });

  const managerCtx = await browser.newContext();
  const managerPage = await managerCtx.newPage();
  await login(managerPage, DEMO_USERS.manager);
  await managerPage.goto('/requests');
  await managerPage.getByRole('button', { name: 'Review' }).first().click();
  await expect(managerPage.getByRole('dialog')).toBeVisible();
  await managerPage.getByRole('button', { name: 'Approve' }).click();
  await expect(managerPage.getByText('approved').first()).toBeVisible({ timeout: 10_000 });
  await managerCtx.close();

  await page.getByTestId('logout-button').click();
  await login(page, DEMO_USERS.itAdmin);
  await page.goto('/requests');
  await page.getByRole('button', { name: 'Mark fulfilled' }).first().click();
  await expect(page.getByText('fulfilled').first()).toBeVisible({ timeout: 15_000 });
});
