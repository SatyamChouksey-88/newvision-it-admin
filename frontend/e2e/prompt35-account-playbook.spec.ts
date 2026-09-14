import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, DEMO_USERS, expectSuccess, loginViaApi } from './helpers';

const API = 'http://localhost:3000/api';
const LOCKOUT_TEMPLATE = 'Account lockout / password / MFA';
const RESOLVE_MACRO = 'Reset completed — verify & close';

test('IT staff can run the password playbook on a lockout ticket', async ({ page }) => {
  await loginViaApi(page);

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
        subject: `Lockout playbook ${Date.now()}`,
        description: 'I am locked out and need a password reset.',
        categoryId: softwareId,
        autoAssign: false,
      },
    })
  ).json();

  await page.goto(`/tickets/show/${ticket.id}`);
  await expect(page.getByTestId('account-playbook')).toBeVisible();
  await page.getByRole('combobox', { name: 'Apply ticket template' }).click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
      hasText: LOCKOUT_TEMPLATE,
    })
    .first()
    .click();
  const applyDialog = page.getByRole('dialog');
  await expect(applyDialog).toBeVisible();
  await applyDialog.getByRole('button', { name: 'Apply template' }).click();
  await expectSuccess(page, /Template applied/i);
  await expect(page.getByText(/Do not reset until/i).first()).toBeVisible();

  await page.getByTestId('verify-identity').click();
  const verifyDialog = page.getByRole('dialog');
  await expect(verifyDialog).toBeVisible();
  await verifyDialog.getByRole('button', { name: 'Identity verified' }).click();
  await expect(page.getByTestId('identity-verified')).toBeVisible();

  await page.getByTestId('send-nv-reset').click();
  const resetDialog = page.getByRole('dialog');
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByRole('button', { name: 'Send reset link' }).click();
  await expectSuccess(page, /Reset link sent/i);
  await expect(page.getByText(/NewVision password reset link sent/i).first()).toBeVisible();

  await page.getByRole('combobox', { name: 'Canned response' }).click();
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', {
      hasText: RESOLVE_MACRO,
    })
    .first()
    .click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Resolved').first()).toBeVisible();
});
