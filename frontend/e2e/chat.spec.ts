import { expect, test } from '@playwright/test';
import { deleteChatMessageByText, DEMO_USERS, login } from './helpers';

test.describe('Team chat', () => {
  test.describe.configure({ timeout: 90_000 });
  test('IT staff can open /chat, send a message, and use the conversation list from the keyboard', async ({
    page,
  }) => {
    await login(page);
    await page.getByRole('button', { name: /team chat/i }).click();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByTestId('chat-page')).toBeVisible();
    await expect(page.getByTestId('chat-appbar')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Assets' })).toHaveCount(0);
    await expect(page.getByTestId('chat-find')).toBeVisible();
    await expect(page.getByTestId('chat-filters').getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByTestId('chat-message-list')).toHaveAttribute('role', 'log');

    const itOps = page.getByRole('option', { name: /#it-ops/i });
    await expect(itOps).toBeVisible();
    await itOps.click();
    await expect(itOps).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.nv-teams-header').getByText('#it-ops')).toBeVisible();

    const ping = `Prompt24 ping ${Date.now()}`;
    const composer = page.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' });
    await composer.fill(ping);
    await page.getByTestId('chat-send').click();
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
    await deleteChatMessageByText(page, ping);
  });

  test('own messages sit to the right of others in #it-ops', async ({ page }) => {
    await login(page);
    await page.goto('/chat');
    await page.getByRole('option', { name: /#it-ops/i }).click();
    const ping = `Bubble ping ${Date.now()}`;
    await page.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' }).fill(ping);
    await page.getByTestId('chat-send').click();
    const mine = page.getByTestId('chat-message-list').locator('article.is-mine').filter({ hasText: ping });
    await expect(mine).toBeVisible({ timeout: 15_000 });
    await expect(mine).toHaveCSS('justify-content', 'flex-end');
    const other = page.getByTestId('chat-message-list').locator('article.is-theirs').first();
    if (await other.count()) {
      await expect(other).toHaveCSS('justify-content', 'flex-start');
    }
    await deleteChatMessageByText(page, ping);
  });

  test('pasting a docx file shows a pending chip', async ({ page }) => {
    await login(page);
    await page.goto('/chat');
    await page.getByRole('option', { name: /#it-ops/i }).click();
    const composer = page.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' });
    await composer.evaluate((el) => {
      const file = new File(['PK'], 'brief.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const data = new DataTransfer();
      data.items.add(file);
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      el.dispatchEvent(event);
    });
    await expect(page.getByTestId('chat-composer').getByText('brief.docx')).toBeVisible();
  });

  test('tablet width shows the conversation list or the transcript, not a stacked rail', async ({
    page,
  }) => {
    await login(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/chat');
    await expect(page.getByTestId('chat-rail')).toBeVisible();
    await expect(page.getByTestId('chat-composer')).toBeVisible();

    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/chat');
    await expect(page.getByTestId('chat-page')).toHaveClass(/is-tablet/);
    await expect(page.getByTestId('chat-rail')).toBeVisible();
    await expect(page.getByTestId('chat-composer')).toBeHidden();
    await page.getByRole('option', { name: /#it-ops/i }).click();
    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.getByTestId('chat-rail')).toBeHidden();
    await page.getByRole('button', { name: 'Back to conversations' }).click();
    await expect(page.getByTestId('chat-rail')).toBeVisible();
  });

  test('Employees do not get a Chat launcher', async ({ page }) => {
    await login(page, DEMO_USERS.employee);
    await expect(page.getByRole('button', { name: /team chat/i })).toHaveCount(0);
    await page.goto('/chat');
    await expect(page).not.toHaveURL(/\/chat/);
  });

  test('two staff sessions see live send, thread, mention, and unread', async ({ browser }) => {
    test.setTimeout(90_000);
    const adminCtx = await browser.newContext();
    const supportCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    const supportPage = await supportCtx.newPage();
    await login(adminPage, DEMO_USERS.itAdmin);
    await login(supportPage, DEMO_USERS.itSupport);
    await adminPage.goto('/chat');
    await supportPage.goto('/chat');
    await expect(adminPage.getByTestId('chat-appbar')).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Assets' })).toHaveCount(0);
    await expect(adminPage.getByTestId('chat-composer').getByRole('button', { name: 'Format' })).toBeVisible();
    await expect(adminPage.getByTestId('chat-send')).toBeVisible();

    await expect(supportPage.getByRole('option', { name: /#helpdesk/i })).toBeVisible();
    await supportPage.getByRole('option', { name: /#helpdesk/i }).click();
    await adminPage.getByRole('option', { name: /#it-ops/i }).click();
    const ping = `Live chrome ping ${Date.now()}`;
    await adminPage.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' }).fill(ping);
    await adminPage.getByTestId('chat-send').click();
    await expect(adminPage.getByTestId('chat-message-list').getByText(ping)).toBeVisible({
      timeout: 15_000,
    });

    const itOpsRow = supportPage.getByRole('option', { name: /#it-ops/i });
    await expect(itOpsRow).toHaveClass(/is-unread/, { timeout: 15_000 });
    await itOpsRow.click();
    await expect(supportPage.getByTestId('chat-message-list').getByText(ping)).toBeVisible({
      timeout: 15_000,
    });

    const sent = supportPage.getByTestId('chat-message-list').locator('article').filter({ hasText: ping });
    await sent.getByRole('button', { name: 'Reply' }).click();
    await expect(supportPage.getByRole('complementary', { name: 'Thread' })).toBeVisible();
    const reply = `Live thread ${Date.now()}`;
    await supportPage
      .getByRole('complementary', { name: 'Thread' })
      .getByRole('textbox', { name: 'Message' })
      .fill(reply);
    await supportPage.getByRole('complementary', { name: 'Thread' }).getByRole('button', { name: 'Send' }).click();
    await expect(supportPage.getByRole('complementary', { name: 'Thread' }).getByText(reply)).toBeVisible({
      timeout: 15_000,
    });

    await adminPage.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' }).fill('@');
    const mentionPick = adminPage
      .getByRole('list', { name: 'Mention someone' })
      .getByRole('button', { name: /Support/i });
    await expect(mentionPick).toBeVisible();
    await mentionPick.click();
    const mentionBody = `Live mention ${Date.now()}`;
    await adminPage.getByTestId('chat-composer').getByRole('textbox', { name: 'Message' }).pressSequentially(` ${mentionBody}`);
    await adminPage.getByTestId('chat-send').click();
    await expect(adminPage.getByTestId('chat-message-list').getByText(mentionBody)).toBeVisible({
      timeout: 15_000,
    });
    await supportPage.getByTestId('chat-filters').getByRole('button', { name: 'Mentions' }).click();
    await expect(supportPage.getByRole('option', { name: /#it-ops/i })).toBeVisible({ timeout: 15_000 });

    await deleteChatMessageByText(adminPage, ping);
    await deleteChatMessageByText(adminPage, mentionBody);
    await adminCtx.close();
    await supportCtx.close();
  });
});
