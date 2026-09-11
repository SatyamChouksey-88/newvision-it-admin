import { expect, test } from '@playwright/test';
import { DEMO_USERS, login } from './helpers';

test.describe('Team chat', () => {
  test('IT staff can open /chat, send a message, and use the conversation list from the keyboard', async ({
    page,
  }) => {
    await login(page);
    await page.getByRole('button', { name: /team chat/i }).click();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByTestId('chat-page')).toBeVisible();
    const itOps = page.getByRole('option', { name: /#it-ops/i });
    await expect(itOps).toBeVisible();
    await itOps.click();
    await expect(itOps).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.nv-teams-header').getByText('#it-ops')).toBeVisible();

    const ping = `Prompt24 ping ${Date.now()}`;
    const composer = page.getByTestId('chat-composer').getByLabel('Message');
    await composer.fill(ping);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('chat-message-list').getByText(ping)).toBeVisible({
      timeout: 15_000,
    });

    const sent = page.getByTestId('chat-message-list').locator('article').filter({ hasText: ping });
    await sent.getByRole('button', { name: 'Reply' }).click();
    await expect(page.getByRole('complementary', { name: 'Thread' })).toBeVisible();

    const rail = page.getByTestId('chat-rail').getByRole('listbox', { name: 'Conversations' });
    await rail.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('option', { selected: true })).toBeVisible();
  });

  test('own messages sit to the right of others in #it-ops', async ({ page }) => {
    await login(page);
    await page.goto('/chat');
    await page.getByRole('option', { name: /#it-ops/i }).click();
    const ping = `Bubble ping ${Date.now()}`;
    await page.getByTestId('chat-composer').getByLabel('Message').fill(ping);
    await page.getByRole('button', { name: 'Send' }).click();
    const mine = page.getByTestId('chat-message-list').locator('article.is-mine').filter({ hasText: ping });
    await expect(mine).toBeVisible({ timeout: 15_000 });
    const other = page.getByTestId('chat-message-list').locator('article.is-theirs').first();
    if (await other.count()) {
      const mineBox = await mine.boundingBox();
      const otherBox = await other.boundingBox();
      expect(mineBox && otherBox && mineBox.x > otherBox.x).toBeTruthy();
    }
  });

  test('pasting a docx file shows a pending chip', async ({ page }) => {
    await login(page);
    await page.goto('/chat');
    await page.getByRole('option', { name: /#it-ops/i }).click();
    const composer = page.getByTestId('chat-composer').getByLabel('Message');
    const dt = await page.evaluateHandle(() => {
      const file = new File(['PK'], 'brief.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const data = new DataTransfer();
      data.items.add(file);
      return data;
    });
    await composer.dispatchEvent('paste', { clipboardData: dt });
    await expect(page.getByTestId('chat-composer').getByText('brief.docx')).toBeVisible();
  });

  test('Employees do not get a Chat launcher', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await expect(page.getByRole('button', { name: /team chat/i })).toHaveCount(0);
    await page.goto('/chat');
    await expect(page).not.toHaveURL(/\/chat/);
  });
});
