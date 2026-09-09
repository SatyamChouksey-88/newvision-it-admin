import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('public scan page shows an asset without logging in', async ({ page, request }) => {
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('newvision:token'));
  const list = await request.get('http://localhost:3000/api/assets?_start=0&_end=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(list.ok()).toBeTruthy();
  const asset = (await list.json()).data[0];
  expect(asset?.assetCode).toBeTruthy();

  await page.goto(`/scan/${asset.assetCode}`);
  await expect(page.getByRole('heading', { name: asset.assetCode })).toBeVisible();
  await expect(page.getByText('Physical audit')).toBeVisible();
  await expect(page.locator('#email')).toHaveCount(0);
});
