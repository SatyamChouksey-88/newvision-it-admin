/**
 * Capture Help documentation screenshots from a running app.
 * Prerequisites: backend on :3000 (seeded), then run frontend on :5173.
 *
 *   cd frontend && node scripts/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/docs/screenshots');
const base = 'http://localhost:5173';
const password = 'Password123!';

async function logoutIfNeeded(page) {
  await page.context().clearCookies();
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) return;
  await page.goto(`${base}/`);
  const logoutBtn = page.getByTestId('logout-button').first();
  if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutBtn.click();
    const confirm = page.getByTestId('logout-confirm');
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirm.click();
    }
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await emailInput.waitFor({ state: 'visible', timeout: 15_000 });
}

/** Wait for any signed-in home — Employees land on My IT, not "Dashboard". */
async function login(page, email) {
  await logoutIfNeeded(page);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25_000 });
  const signedIn = page.getByTestId('logout-button').first();
  if (!(await signedIn.isVisible({ timeout: 8_000 }).catch(() => false))) {
    await page.locator('h1, h2, .nv-page-title').first().waitFor({ timeout: 15_000 });
  }
}

const shots = [
  { name: 'login.png', fn: async (page) => { await page.goto(`${base}/login`); } },
  { name: 'dashboard.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/`); } },
  { name: 'assets-list.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/assets`); } },
  { name: 'asset-detail.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.goto(`${base}/assets`);
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/assets\/show\//);
  }},
  { name: 'employee-profile.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.goto(`${base}/employees`);
    await page.locator('table tbody tr.ant-table-row').first().click();
  }},
  { name: 'locations.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/locations`); } },
  { name: 'maintenance.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/maintenance`); } },
  { name: 'accessories.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/accessories`); } },
  { name: 'reports.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/reports`); } },
  { name: 'requests.png', fn: async (page) => { await login(page, 'employee@newvision.local'); await page.goto(`${base}/requests`); } },
  { name: 'audit-log.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/audit-logs`); } },
  { name: 'import-summary.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/settings?tab=imports`); } },
  { name: 'notifications.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.getByRole('button', { name: /notifications/i }).click();
  }},
  { name: 'assign-modal.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.goto(
      `${base}/assets?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=available`,
    );
    await page.waitForTimeout(1200);
    const assignBtn = page.locator('button:not([disabled])').filter({ hasText: /^Assign$/i }).first();
    if (await assignBtn.count()) {
      await assignBtn.click({ timeout: 15_000 });
      await page.getByRole('dialog').waitFor({ state: 'visible' });
    }
  }},
  { name: 'scan-page.png', fn: async (page) => { await page.goto(`${base}/scan/AST-PUN-LAP-0001`); } },
  { name: 'tickets.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/tickets`); } },
  { name: 'ticket-detail.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.goto(`${base}/tickets`);
    await page.locator('table tbody tr.ant-table-row').first().click();
    await page.waitForURL(/\/tickets\/show\//);
  }},
  { name: 'settings.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/settings`); } },
  { name: 'chat.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.getByRole('button', { name: /IT staff chat|Chat/i }).first().click();
    await page.getByText('#it-ops').waitFor({ timeout: 10_000 }).catch(() => undefined);
  }},
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const s of shots) {
  try {
    await s.fn(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, s.name), fullPage: false });
    console.log('OK', s.name);
  } catch (e) {
    console.error('FAIL', s.name, e.message);
  }
}

await browser.close();
console.log('Done →', outDir);
