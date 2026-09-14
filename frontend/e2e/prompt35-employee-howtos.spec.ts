import { expect, test } from '@playwright/test';
import { DEMO_USERS, loginViaApi } from './helpers';

test('employee My IT links to the VPN how-to', async ({ page }) => {
  await loginViaApi(page, DEMO_USERS.employee);
  await expect(page.getByTestId('my-it-home')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('employee-howtos')).toBeVisible();
  await page.getByTestId('employee-howtos').locator('a[href="/help/howto-vpn"]').click();
  await expect(page).toHaveURL(/\/help\/howto-vpn/);
  await expect(page.getByRole('heading', { level: 1, name: 'VPN from home or a hotel' })).toBeVisible();
  await expect(page.getByText(/NewVision VPN/i).first()).toBeVisible();
});
