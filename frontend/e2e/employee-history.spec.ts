import { expect, test, type Page } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, login } from './helpers';

const API = 'http://localhost:3000/api';

async function apiToken(page: Page, email = DEMO_USERS.itAdmin) {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password: DEMO_PASSWORD } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token as string;
}

test.describe('Employee profile history', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
  });

  test('shows History tab with timeline events', async ({ page }) => {
    // Picking "whatever sorts first" for a bare "EMP-" search is non-deterministic in intent —
    // the default employees sort (most recently created first) can surface a demo/system
    // account with no assignment history at all. Ask the API for an employee who definitely
    // has an open asset assignment instead, so the History tab has something to show.
    const token = await apiToken(page);
    const assigned = await page.request.get(
      `${API}/assets?_start=0&_end=1&status=assigned`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(assigned.ok()).toBeTruthy();
    const { data } = await assigned.json();
    const employeeId = data[0]?.assignedEmployeeId;
    expect(employeeId).toBeTruthy();

    await page.goto(`/employees/show/${employeeId}`);
    const historyResp = page.waitForResponse(
      (r) => r.url().includes('/employees/') && r.url().includes('/history') && r.status() === 200,
    );
    await page.getByRole('tab', { name: 'History' }).click();
    await historyResp;
    const historyTable = page.getByRole('tabpanel', { name: /History/i }).locator('table tbody');
    await expect(
      historyTable.getByText(/Asset assignment|Asset request|Asset transfer|Maintenance|Accessory/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Dashboard drill-down', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
  });

  test('Assigned metric card navigates to filtered assets list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^Assigned:/ }).click();
    await page.waitForURL(/\/assets/);
    await expect(page).toHaveURL(/status.*assigned|filters.*assigned/i);
  });
});
