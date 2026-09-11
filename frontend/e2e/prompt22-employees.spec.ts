import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, login } from './helpers';

const API = 'http://localhost:3000/api';

test('employees list shows contract-ending and incomplete-checklist tags', async ({ page }) => {
  await login(page);
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: DEMO_USERS.itAdmin, password: DEMO_PASSWORD },
  });
  expect(loginRes.ok()).toBeTruthy();
  const token = (await loginRes.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };

  const locations = await (await page.request.get(`${API}/locations?_start=0&_end=1`, { headers })).json();
  const stamp = Date.now();
  const created = await page.request.post(`${API}/employees`, {
    headers,
    data: {
      employeeCode: `EMP-P22-${stamp}`,
      firstName: 'Contract',
      lastName: `Followup${stamp}`,
      email: `contract.followup.${stamp}@newvision.local`,
      locationId: locations.data[0].id,
      employmentType: 'contract',
      contractEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  expect(created.ok()).toBeTruthy();
  const emp = await created.json();

  const checklist = await page.request.post(`${API}/employees/${emp.id}/checklists`, {
    headers,
    data: { kind: 'onboard' },
  });
  expect(checklist.ok()).toBeTruthy();

  await page.goto('/employees');
  await page.getByLabel('Search employees').fill(`Followup${stamp}`);
  await page.getByLabel('Search employees').press('Enter');
  await expect(page.getByText(`Followup${stamp}`).first()).toBeVisible();
  await expect(page.getByText('Onboard incomplete').first()).toBeVisible();
  await expect(page.getByText(/Contract ends/i).first()).toBeVisible();

  await page.goto(`/employees/show/${emp.id}`);
  await expect(page.getByText(/Contract ends/i).first()).toBeVisible();
  await expect(page.getByText('Checklist incomplete').first()).toBeVisible();
});
