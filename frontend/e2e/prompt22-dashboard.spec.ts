import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test('IT Admin keeps KPI tiles and shows the My work list', async ({ page }) => {
  await login(page, DEMO_USERS.itAdmin);
  await expect(page.getByTestId('estate-dashboard')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Total Assets:/ })).toBeVisible();
  await expect(page.getByTestId('my-work')).toBeVisible();
  await expect(page.getByTestId('my-work').getByText('My work')).toBeVisible();

  const myWork = page.getByTestId('my-work');
  const caret = myWork.getByRole('button', { name: /collapse section/i });
  await expect(caret).toBeVisible();
  // Only My work has a collapse caret — not Status / Location / Tickets.
  await expect(page.getByRole('button', { name: /collapse section/i })).toHaveCount(1);
  await expect(myWork.getByTestId('my-work-list')).toBeVisible();
  await caret.click();
  await expect(myWork.getByTestId('my-work-list')).toBeHidden();
  await myWork.getByRole('button', { name: /expand section/i }).click();
  await expect(myWork.getByTestId('my-work-list')).toBeVisible();
});

test('IT Support home is the My work queue, not estate KPIs', async ({ page }) => {
  await login(page, DEMO_USERS.itSupport);
  await expect(page.getByTestId('support-home')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Queue' })).toBeVisible();
  await expect(page.getByTestId('my-work')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Total Assets:/ })).toHaveCount(0);
});
