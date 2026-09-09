import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Help documentation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('help home loads with feature cards', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Help & Documentation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Getting Started' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Assets — Overview/i })).toBeVisible();
  });

  test('search navigates to keyboard shortcuts article', async ({ page }) => {
    await page.goto('/help');
    await page.getByLabel('Search help articles').fill('keyboard');
    await page.getByRole('menuitem', { name: 'Keyboard Shortcuts' }).click();
    await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible();
  });

  test('article route loads getting started', async ({ page }) => {
    await page.goto('/help/getting-started');
    await expect(page.getByRole('heading', { name: 'Getting Started' })).toBeVisible();
    await expect(page.getByText('Password123!')).toBeVisible();
  });
});
