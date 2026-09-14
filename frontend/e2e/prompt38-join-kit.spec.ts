import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, login, openGlobalSearch } from './helpers';

const API = 'http://localhost:3000/api';

test.describe('Prompt 38 — join date, My kit, phone, sticky', () => {
  test('Add employee requires a date of joining field', async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
    await page.goto('/employees');
    await page.getByRole('button', { name: 'Add employee' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Date of joining')).toBeVisible();
    await expect(dialog.getByText(/offer or actual start/i)).toBeVisible();
  });

  test('employee My kit shows a checked-out accessory', async ({ page }) => {
    const empLogin = await page.request.post(`${API}/auth/login`, {
      data: { email: DEMO_USERS.employee, password: DEMO_PASSWORD },
    });
    expect(empLogin.ok()).toBeTruthy();
    const employeeId = (await empLogin.json()).user?.employeeId as number | undefined;
    expect(employeeId).toBeTruthy();

    const loginRes = await page.request.post(`${API}/auth/login`, {
      data: { email: DEMO_USERS.itAdmin, password: DEMO_PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = (await loginRes.json()).access_token as string;
    const headers = { Authorization: `Bearer ${token}` };

    const accessories = await (
      await page.request.get(`${API}/accessories?_start=0&_end=50`, { headers })
    ).json();
    const mouse = (accessories.data as { id: number; name: string; quantityAvailable: number }[]).find(
      (a) => /mouse/i.test(a.name) && a.quantityAvailable > 0,
    );
    expect(mouse).toBeTruthy();
    const hiddenSerial = `SN-KIT-${Date.now()}`;

    await page.request.post(`${API}/accessories/${mouse!.id}/checkout`, {
      headers,
      data: { employeeId, quantity: 1, serialNumber: hiddenSerial },
    });

    await login(page, DEMO_USERS.employee);
    await page.goto('/');
    await expect(page.getByTestId('my-it-home')).toBeVisible();
    const homeCard = page.getByTestId('my-kit-accessory').filter({ hasText: mouse!.name });
    await expect(homeCard).toBeVisible();
    await expect(homeCard.getByText('Return to IT')).toBeVisible();
    await expect(page.getByText(hiddenSerial)).toHaveCount(0);

    await page.goto('/assets');
    await expect(page.getByText('My kit').first()).toBeVisible();
    const kitCard = page.getByTestId('my-kit-accessory').filter({ hasText: mouse!.name });
    await expect(kitCard).toBeVisible();
    await expect(page.locator('.nv-grid')).toHaveCount(0);

    await login(page, DEMO_USERS.itAdmin);
    await page.goto('/assets');
    await expect(page.getByText('Assets').first()).toBeVisible();
    await expect(page.locator('.nv-grid')).toBeVisible();
    await expect(page.getByRole('cell', { name: mouse!.name, exact: true })).toHaveCount(0);
  });

  test('Employee home at 390px has no page-level horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, DEMO_USERS.employee);
    await page.goto('/');
    await expect(page.getByTestId('my-it-home')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(12);
    await page.getByRole('link', { name: 'Raise a ticket' }).click();
    await expect(page).toHaveURL(/\/tickets\/create/);
  });

  test('IT Admin at 390px can search an asset code and open it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, DEMO_USERS.itAdmin);
    const search = await openGlobalSearch(page);
    await search.fill('AST-PUN');
    const hit = page.getByRole('option').filter({ hasText: 'AST-PUN' }).first();
    await expect(hit).toBeVisible({ timeout: 10_000 });
    await hit.click();
    await expect(page).toHaveURL(/\/assets\/show\/\d+/);
  });

  test('Assets title and thead stay under the header after scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, DEMO_USERS.itAdmin);
    await page.goto('/assets');
    const thead = page.locator('.nv-grid .ant-table-thead').first();
    await expect(thead).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 900));
    const header = page.locator('.ant-layout-header').first();
    const tbox = await thead.boundingBox();
    const hbox = await header.boundingBox();
    expect(tbox).toBeTruthy();
    expect(hbox).toBeTruthy();
    expect(tbox!.y).toBeGreaterThanOrEqual(hbox!.y + hbox!.height - 4);
    await expect(page.getByText('Assets').first()).toBeVisible();
    await expect(page.getByTestId('hardware-tabs')).toBeVisible();
  });
});
