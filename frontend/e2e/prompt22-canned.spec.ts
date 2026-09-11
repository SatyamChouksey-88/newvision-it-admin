import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, login } from './helpers';

const API = 'http://localhost:3000/api';

test('canned wait-macro sets waiting on employee when the reply is sent', async ({ page }) => {
  await login(page);
  const token = (
    await (
      await page.request.post(`${API}/auth/login`, {
        data: { email: DEMO_USERS.itAdmin, password: DEMO_PASSWORD },
      })
    ).json()
  ).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };

  const canned = await (
    await page.request.post(`${API}/canned-responses`, {
      headers,
      data: {
        title: `Wait macro ${Date.now()}`,
        body: 'Please send a screenshot of the error and reply on this ticket.',
        statusOnSend: 'waiting_on_employee',
      },
    })
  ).json();

  const empToken = (
    await (
      await page.request.post(`${API}/auth/login`, {
        data: { email: DEMO_USERS.employee, password: DEMO_PASSWORD },
      })
    ).json()
  ).access_token as string;
  const cats = await (
    await page.request.get(`${API}/ticket-categories`, {
      headers: { Authorization: `Bearer ${empToken}` },
    })
  ).json();
  const softwareId = cats.find((c: { code: string }) => c.code === 'software').id;
  const ticket = await (
    await page.request.post(`${API}/support-tickets`, {
      headers: { Authorization: `Bearer ${empToken}` },
      data: {
        subject: `Canned macro ${Date.now()}`,
        description: 'Need a screenshot request.',
        categoryId: softwareId,
        autoAssign: false,
      },
    })
  ).json();

  await page.goto(`/tickets/show/${ticket.id}`);
  await page.getByRole('combobox', { name: 'Canned response' }).click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
      hasText: canned.title,
    })
    .first()
    .click();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Waiting on employee').first()).toBeVisible({ timeout: 10_000 });
});
