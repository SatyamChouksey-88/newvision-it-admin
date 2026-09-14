import { expect, test } from '@playwright/test';
import { DEMO_USERS, loginViaApi } from './helpers';

test('IT staff can confirm location and stamp audit from the sticker page', async ({ page }) => {
  await loginViaApi(page, DEMO_USERS.itAdmin);
  const token = await page.evaluate(() => sessionStorage.getItem('newvision:token'));
  expect(token).toBeTruthy();
  const list = await page.request.get('http://localhost:3000/api/assets?_start=0&_end=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(list.ok()).toBeTruthy();
  const asset = (await list.json()).data[0] as { assetCode: string };
  expect(asset?.assetCode).toBeTruthy();

  await page.goto(`/scan/${asset.assetCode}`);
  await expect(page.getByRole('heading', { name: asset.assetCode })).toBeVisible();
  await expect(page.getByTestId('scan-audit')).toBeVisible();
  await expect(page.getByText('Confirm location')).toBeVisible();
  await page.getByRole('button', { name: 'Stamp last audited today' }).click();
  await expect(page.getByTestId('scan-audited')).toBeVisible({ timeout: 15_000 });
});
