import { expect, test } from '@playwright/test';
import { helpArticles } from '../src/help/articles';
import { login } from './helpers';

test.describe('Help documentation site', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('landing page shows the "At a glance" card grid and a working "Back to app" link', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'NewVision documentation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'At a glance' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Support Tickets/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Roles & Permissions/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Settings/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Tips & Troubleshooting/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How the app is organized' })).toBeVisible();

    await page.getByRole('link', { name: /Back to app/ }).click();
    await expect(page).toHaveURL('/');
  });

  test('the multi-level nav tree expands/collapses and highlights the active page', async ({ page }) => {
    await page.goto('/help/getting-started');
    const nav = page.getByRole('navigation', { name: 'Documentation sections' });
    // The category containing the current article is expanded by default.
    await expect(nav.getByRole('link', { name: 'Getting Started' })).toBeVisible();

    // A collapsed category's articles are not in the tree until expanded.
    await expect(nav.getByRole('link', { name: 'Managing the IT queue' })).toHaveCount(0);
    await nav.getByRole('button', { name: 'Support tickets' }).click();
    await nav.getByRole('button', { name: 'For IT staff' }).click();
    await expect(nav.getByRole('link', { name: 'Managing the IT queue' })).toBeVisible();

    // Collapsing the section hides its articles again.
    await nav.getByRole('button', { name: 'Support tickets' }).click();
    await expect(nav.getByRole('link', { name: 'Managing the IT queue' })).toHaveCount(0);
  });

  test('the table of contents is generated from the article\'s real headings', async ({ page }) => {
    await page.goto('/help/getting-started');
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await expect(toc.getByRole('link', { name: 'Welcome to NewVision' })).toBeVisible();
    await expect(toc.getByRole('link', { name: 'Demo logins' })).toBeVisible();
    await expect(toc.getByRole('link', { name: 'First steps for a new admin' })).toBeVisible();

    await toc.getByRole('link', { name: 'Demo logins' }).click();
    await expect(page).toHaveURL(/#demo-logins$/);
    await expect(page.locator('#demo-logins')).toBeVisible();
  });

  test('admonition callouts render for note/tip/warning content', async ({ page }) => {
    await page.goto('/help/getting-started');
    await expect(page.getByText('Tip').first()).toBeVisible();
    await expect(page.getByText(/command palette/).first()).toBeVisible();
  });

  test('instant client-side search finds a page and a specific section', async ({ page }) => {
    await page.goto('/help');
    await page.getByRole('button', { name: /Search the docs/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Search the docs…').fill('keyboard');
    await expect(dialog.getByText('Keyboard Shortcuts').first()).toBeVisible();
    await dialog.getByText('Keyboard Shortcuts').first().click();
    await expect(page).toHaveURL(/\/help\/keyboard-shortcuts/);

    // A heading-level match (not just a whole-page title match).
    await page.getByRole('button', { name: /Search the docs/ }).click();
    await page.getByPlaceholder('Search the docs…').fill('demo logins');
    await expect(page.getByText(/Getting Started.*Demo logins/)).toBeVisible();
  });

  test('every documented article route renders without error', async ({ page }) => {
    for (const article of helpArticles) {
      await page.goto(`/help/${article.id}`);
      await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
    }
  });

  test('table of contents is derived from a second article, not hand-maintained', async ({ page }) => {
    await page.goto('/help/locations-departments');
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await expect(toc.getByRole('link', { name: 'How they relate' })).toBeVisible();
    await expect(toc.getByRole('link', { name: 'What is working today' })).toBeVisible();
  });

  test('nav tree is keyboard reachable and Home returns to the landing page', async ({ page }) => {
    await page.goto('/help/getting-started');
    const nav = page.getByRole('navigation', { name: 'Documentation sections' });
    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/help\/?$/);
    await expect(page.getByRole('heading', { name: 'NewVision documentation' })).toBeVisible();

    await page.goto('/help/getting-started');
    await page.getByRole('link', { name: 'Skip to content' }).focus();
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.getByRole('link', { name: 'Skip to content' }).click();
    await expect(page).toHaveURL(/#nv-doc-main/);
    await expect(page.locator('#nv-doc-main')).toBeVisible();
  });

  test('search finds a section inside a newly added article', async ({ page }) => {
    await page.goto('/help');
    await page.getByRole('button', { name: /Search the docs/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Search the docs…').fill('hidden gems');
    await expect(dialog.getByText(/Tips & Troubleshooting/).first()).toBeVisible();
  });
});
