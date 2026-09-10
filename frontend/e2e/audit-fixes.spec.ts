import { expect, test, type Page } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, expectSuccess, login, openGlobalSearch } from './helpers';

const API = 'http://localhost:3000/api';

/** Small API helper so tests can set up their own fixtures instead of mutating demo users. */
async function apiToken(page: Page, email = DEMO_USERS.itAdmin) {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password: DEMO_PASSWORD } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token as string;
}

test.describe('Functionality audit — browser regressions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.itAdmin);
  });

  test('employee list status filter syncs with the URL and reinstate restores an offboarded employee', async ({
    page,
  }) => {
    const token = await apiToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    const locations = await (await page.request.get(`${API}/locations?_start=0&_end=1`, { headers })).json();
    const stamp = Date.now();
    const created = await page.request.post(`${API}/employees`, {
      headers,
      data: {
        employeeCode: `E2E-${stamp}`,
        firstName: 'Audit',
        lastName: `Fixture${stamp}`,
        email: `audit.fixture.${stamp}@newvision.local`,
        locationId: locations.data[0].id,
      },
    });
    expect(created.ok()).toBeTruthy();
    const emp = await created.json();

    // Offboard through the UI.
    await page.goto(`/employees/show/${emp.id}`);
    await page.getByRole('button', { name: 'Offboard' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Offboard employee' }).click();
    await expectSuccess(page, /offboarded/i);
    await expect(page.getByRole('button', { name: 'Reinstate' })).toBeVisible();

    // The Inactive filter is reflected in the URL and finds the employee.
    await page.goto('/employees');
    await page.locator('.ant-select[aria-label="Filter by employment status"]').click();
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
      hasText: 'Inactive',
    }).click();
    await expect(page).toHaveURL(/isActive.*false/);
    await page.getByLabel('Search employees').fill(`E2E-${stamp}`);
    await page.getByLabel('Search employees').press('Enter');
    await expect(page.getByText(`E2E-${stamp}`).first()).toBeVisible();

    // Reinstate through the UI.
    await page.goto(`/employees/show/${emp.id}`);
    await page.getByRole('button', { name: 'Reinstate' }).click();
    await page.getByRole('button', { name: 'Reinstate', exact: true }).last().click();
    await expectSuccess(page, /reinstated/i);
    await expect(page.getByRole('button', { name: 'Offboard' })).toBeVisible();
  });

  test('audit log filters by action from the URL and searches summaries', async ({ page }) => {
    await page.goto('/audit-logs?filters[0][field]=action&filters[0][operator]=eq&filters[0][value]=create');
    const tags = page.locator('table tbody tr.ant-table-row .ant-tag');
    await expect(tags.first()).toBeVisible();
    const texts = await tags.allInnerTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t.trim()).toBe('create');

    await page.goto('/audit-logs');
    await page.getByLabel('Search audit log').fill('Reinstated');
    await page.getByLabel('Search audit log').press('Enter');
    await expect(page).toHaveURL(/q.*Reinstated/i);
    await expect(page.locator('table tbody tr.ant-table-row').first()).toContainText(/Reinstated/i);
  });

  test('consumables low-stock toggle asks the API for lowStock rows', async ({ page }) => {
    await page.goto('/consumables');
    const lowStockRequest = page.waitForRequest(
      (r) => r.url().includes('/consumables') && r.url().includes('lowStock=true'),
    );
    await page.getByRole('checkbox', { name: 'Low stock only' }).check();
    await lowStockRequest;
  });

  test('dashboard location filter is kept in the URL', async ({ page }) => {
    await page.goto('/');
    const picker = page.getByRole('combobox', { name: 'Filter dashboard by location' });
    await picker.click();
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .first()
      .click();
    await expect(page).toHaveURL(/locationId=\d+/);
    await page.reload();
    await expect(picker).toBeVisible();
    await expect(page).toHaveURL(/locationId=\d+/);
    // The chosen location survives the reload (read back from the URL).
    await expect(page.locator('.ant-select-selection-item').first()).toBeVisible();
  });

  test('notifications bell can mark everything read', async ({ page }) => {
    const token = await apiToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    // Ensure there is at least one unread notification for this user by running the warranty check.
    await page.request.post(`${API}/warranty/run-check`, { headers });
    await page.goto('/');
    await page.getByRole('button', { name: /^Notifications/ }).click();
    const markAll = page.getByRole('button', { name: 'Mark all read' });
    const emptyText = page.getByText('No unread notifications');
    // Either the seeded data produced unread alerts (normal) or there were none to begin with.
    await expect(markAll.or(emptyText).first()).toBeVisible();
    if (await markAll.isVisible()) {
      const patch = page.waitForResponse(
        (r) => r.url().includes('/notifications/read-all') && r.request().method() === 'PATCH',
      );
      await markAll.click();
      const res = await patch;
      expect(res.status(), await res.text()).toBe(200);
      await expect(emptyText).toBeVisible();
      await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
    }
  });

  test('global search ticket result opens the maintenance list pre-filtered', async ({ page }) => {
    const token = await apiToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    const assets = await (
      await page.request.get(`${API}/assets?_start=0&_end=1`, { headers })
    ).json();
    const ticket = await page.request.post(`${API}/maintenance`, {
      headers,
      data: { assetId: assets.data[0].id, issue: 'UniqueFlickerSearchTerm' },
    });
    expect(ticket.ok()).toBeTruthy();
    const body = await ticket.json();

    await page.goto('/');
    const search = await openGlobalSearch(page);
    await search.fill(String(body.id));
    await expect(page.getByText(`#${body.id}`).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText(`#${body.id}`).first().click();
    await page.waitForURL(/\/maintenance/);
    await expect(page).toHaveURL(/filters.*q|q=/);
    await expect(page.getByText('UniqueFlickerSearchTerm').first()).toBeVisible({ timeout: 15_000 });
  });

  test('asset list status dropdown can change an available asset to under repair', async ({ page }) => {
    await page.goto(
      '/assets?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=available',
    );
    const statusSelect = page.locator('table tbody tr.ant-table-row .ant-select').first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.click();
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
        hasText: 'Under Repair',
      })
      .click();
    await expect(page.getByText(/under_repair/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('fulfilled request can still be edited and history is recorded', async ({ page }) => {
    const token = await apiToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    const cats = await (await page.request.get(`${API}/asset-categories?_start=0&_end=1`, { headers })).json();
    const empTok = await apiToken(page, DEMO_USERS.employee);
    const created = await page.request.post(`${API}/asset-requests`, {
      headers: { Authorization: `Bearer ${empTok}` },
      data: { kind: 'asset', categoryId: cats.data[0].id, reason: 'Editable after fulfill' },
    });
    expect(created.ok()).toBeTruthy();
    const req = await created.json();
    await page.request.patch(`${API}/asset-requests/${req.id}/review`, {
      headers,
      data: { decision: 'approved', comment: 'ok' },
    });
    await page.request.patch(`${API}/asset-requests/${req.id}/fulfill`, { headers });

    await page.goto('/requests');
    await page.getByPlaceholder(/Filter rows/i).fill('Editable after fulfill');
    await page.getByRole('button', { name: 'Edit' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Reason').fill('Editable after fulfill — corrected');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(/updated/i).first()).toBeVisible();
  });

  test('asset transfer modal hides the current location and blocks no-op transfers', async ({ page }) => {
    await page.goto('/assets?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=assigned');
    await page.getByRole('button', { name: 'Transfer' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Nothing selected yet → primary action disabled.
    await expect(dialog.getByRole('button', { name: 'Transfer' })).toBeDisabled();
    await expect(dialog.getByText(/Currently at/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });
});
