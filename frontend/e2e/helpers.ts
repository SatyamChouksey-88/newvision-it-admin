import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'Password123!';

export const DEMO_USERS = {
  superAdmin: 'superadmin@newvision.local',
  itAdmin: 'itadmin@newvision.local',
  itSupport: 'support@newvision.local',
  manager: 'manager@newvision.local',
  employee: 'employee@newvision.local',
};

/** Clear an existing Refine session so the login form is reachable. */
export async function logoutIfNeeded(page: Page) {
  await page.goto('/login');
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) return;

  await page.goto('/');
  const logoutBtn = page.getByTestId('logout-button');
  if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutBtn.click();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    return;
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  await page.goto('/login');
}

/** Log in through the UI and wait for the dashboard to render. */
export async function login(page: Page, email = DEMO_USERS.itAdmin) {
  await logoutIfNeeded(page);
  // Refine's AntD AuthPage renders inputs with ids matching the field name.
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** The currently-open (non-hidden) Ant Design dropdown portal. */
function openDropdown(page: Page): Locator {
  return page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
}

/**
 * Open an Ant Design Select by its placeholder text and pick an option.
 * If optionText is omitted, the first available option is chosen.
 */
export async function selectByPlaceholder(page: Page, placeholder: string, optionText?: string | RegExp) {
  await page
    .locator(`.ant-select:has(.ant-select-selection-placeholder:text-is("${placeholder}"))`)
    .first()
    .click();
  const dd = openDropdown(page);
  await dd.waitFor({ state: 'visible' });
  const option = optionText
    ? dd.locator('.ant-select-item-option', { hasText: optionText }).first()
    : dd.locator('.ant-select-item-option').first();
  await option.click();
}

/** Pick the first option of the Nth Ant Design Select inside a given scope (e.g. a modal). */
export async function selectFirstOption(page: Page, scope: Locator, index = 0) {
  await scope.locator('.ant-select').nth(index).click();
  const dd = openDropdown(page);
  await dd.waitFor({ state: 'visible' });
  await dd.locator('.ant-select-item-option').first().click();
}

/** Assert an Ant Design success message toast appears (optionally matching text). */
export async function expectSuccess(page: Page, text?: string | RegExp) {
  const toast = page.locator('.ant-message-success');
  await expect(toast.first()).toBeVisible();
  if (text) await expect(toast.filter({ hasText: text }).first()).toBeVisible();
}
