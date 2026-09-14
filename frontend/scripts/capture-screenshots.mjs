/**
 * Capture Help documentation screenshots from a running app.
 * Prerequisites: backend on :3000 (seeded), frontend on :5173.
 *
 *   cd frontend && npm run screenshots
 *
 * Re-run after UI changes so Help images stay current. Screenshots are light-theme
 * 1280×800 PNGs; optional numbered callouts are painted onto the image.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/docs/screenshots');
const base = process.env.HELP_SHOT_BASE || 'http://localhost:5173';
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

async function login(page, email) {
  await logoutIfNeeded(page);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25_000 });
  const signedIn = page.getByTestId('logout-button').first();
  if (!(await signedIn.isVisible({ timeout: 8_000 }).catch(() => false))) {
    await page.locator('h1, h2, h3, .nv-page-title').first().waitFor({ timeout: 15_000 });
  }
}

/** Paint numbered badges on the first matching selector for each entry. */
async function annotate(page, selectors) {
  await page.evaluate((sels) => {
    document.querySelectorAll('.nv-shot-callout').forEach((el) => el.remove());
    sels.forEach((sel, i) => {
      let el = null;
      try {
        el = document.querySelector(sel);
      } catch {
        return;
      }
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 && r.height < 2) return;
      const badge = document.createElement('div');
      badge.className = 'nv-shot-callout';
      badge.textContent = String(i + 1);
      Object.assign(badge.style, {
        position: 'fixed',
        left: `${Math.max(4, r.left - 6)}px`,
        top: `${Math.max(4, r.top - 6)}px`,
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: '#0958D9',
        color: '#fff',
        font: '700 12px/22px ui-sans-serif, system-ui, sans-serif',
        textAlign: 'center',
        zIndex: '2147483647',
        boxShadow: '0 0 0 2px #fff, 0 1px 4px rgba(15,23,42,0.25)',
        pointerEvents: 'none',
      });
      document.body.appendChild(badge);
    });
  }, selectors);
}

async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('OK', name);
}

const itAdmin = 'itadmin@newvision.local';
const employee = 'employee@newvision.local';
const superAdmin = 'superadmin@newvision.local';

const shots = [
  {
    name: 'login.png',
    fn: async (page) => {
      await page.goto(`${base}/login`);
      await page.locator('#email').waitFor();
      await annotate(page, ['#email', '#password', '.ant-btn-primary']);
    },
  },
  {
    name: 'dashboard.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/`);
      await page.locator('.nv-page-title, h3').first().waitFor({ timeout: 15_000 });
      await annotate(page, ['.ant-card', '[class*="my-work"], .nv-card']);
    },
  },
  {
    name: 'my-it.png',
    fn: async (page) => {
      await login(page, employee);
      await page.goto(`${base}/`);
      await page.getByRole('heading', { name: /My IT/i }).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      await annotate(page, ['.ant-btn-primary', 'button.ant-btn-default']);
    },
  },
  {
    name: 'assets-list.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/assets`);
      await page.locator('table tbody tr.ant-table-row').first().waitFor({ timeout: 20_000 });
    },
  },
  {
    name: 'asset-detail.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/assets`);
      await page.locator('tbody tr.ant-table-row').first().click({ position: { x: 220, y: 18 } });
      await page.waitForURL(/\/assets\/show\//, { timeout: 15_000, waitUntil: 'commit' });
    },
  },
  {
    name: 'assign-modal.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(
        `${base}/assets?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=available`,
      );
      await page.locator('table tbody tr.ant-table-row').first().waitFor({ timeout: 20_000 });
      await page.locator('tbody tr.ant-table-row').first().click({ position: { x: 220, y: 18 } });
      await page.waitForURL(/\/assets\/show\//, { timeout: 15_000, waitUntil: 'commit' }).catch(() => undefined);
      const assignBtn = page.getByRole('button', { name: /^Assign$/i }).first();
      if (await assignBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await assignBtn.click();
        await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
        await annotate(page, ['.ant-modal-content', '.ant-select', '.ant-btn-primary']);
      }
    },
  },
  {
    name: 'employee-profile.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/employees`);
      await page.locator('table tbody tr.ant-table-row').first().click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'locations.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/locations`);
      await page.locator('table, .ant-empty').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'maintenance.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/maintenance`);
      await page.locator('table, .ant-empty, h4').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'accessories.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/accessories`);
      await page.getByRole('heading', { name: 'Accessories' }).waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'reports.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/reports`);
      await page.getByText(/Asset Report|Reports/i).first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'requests.png',
    fn: async (page) => {
      await login(page, employee);
      await page.goto(`${base}/requests`);
      await page.locator('h4, table, .ant-empty').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'audit-log.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/audit-logs`);
      await page.locator('table, .ant-empty').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'import-summary.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/settings?tab=imports`);
      await page.getByText(/Import jobs|Upload/i).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    },
  },
  {
    name: 'reconciliation.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/settings?tab=reconcile`);
      await page.getByText(/Reconciliation|Upload/i).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    },
  },
  {
    name: 'notifications.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.getByRole('button', { name: /notifications/i }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'scan-page.png',
    fn: async (page) => {
      await page.goto(`${base}/scan/AST-PUN-LAP-0001`);
      await page.waitForTimeout(1000);
    },
  },
  {
    name: 'tickets.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/tickets`);
      await page.locator('table tbody tr.ant-table-row, .ant-empty').first().waitFor({ timeout: 20_000 });
      await annotate(page, ['.ant-table', '.ant-btn-primary']);
    },
  },
  {
    name: 'ticket-detail.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/tickets`);
      await page.locator('table tbody tr.ant-table-row').first().click();
      await page.waitForURL(/\/tickets\/show\//, { timeout: 15_000 });
      await annotate(page, ['textarea, .ant-input', '[class*="watcher"], .ant-select']);
    },
  },
  {
    name: 'settings.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/settings`);
      await page.getByText(/Your account|Account/i).first().waitFor({ timeout: 15_000 });
      await annotate(page, ['.ant-tabs-tab', '.ant-radio-group', 'form, .ant-card']);
    },
  },
  {
    name: 'users.png',
    fn: async (page) => {
      await login(page, superAdmin);
      await page.goto(`${base}/settings?tab=users`);
      await page.getByText(/Users|Create/i).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    },
  },
  {
    name: 'chat.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/chat`);
      await page.getByTestId('chat-page').waitFor({ timeout: 15_000 }).catch(() => undefined);
      await page.getByText(/#it-ops|#helpdesk|Chat/i).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
      await annotate(page, ['[data-testid="chat-page"] nav, .nv-chat-rail', '[data-testid="chat-page"]']);
    },
  },
  {
    name: 'vendors.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/procurement/vendors`);
      await page.locator('table, .ant-empty, h4').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'requisition-form.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/procurement/requisitions/create`);
      await page.waitForTimeout(800);
      if (!page.url().includes('requisition')) {
        await page.goto(`${base}/procurement/requisitions`);
        const add = page.getByRole('button', { name: /new|create|raise/i }).first();
        if (await add.isVisible({ timeout: 4000 }).catch(() => false)) await add.click();
      }
      await page.locator('form, .ant-form, input').first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    },
  },
  {
    name: 'requisition-detail.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/procurement/requisitions`);
      await page.getByText(/PR-/).first().click();
      await page.waitForURL(/\/requisitions\/show\//, { timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'po-detail.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/procurement/orders`);
      await page.getByText(/PO-/).first().click();
      await page.waitForURL(/\/orders\/show\//, { timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'contracts.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/procurement/contracts`);
      await page.locator('table, .ant-empty, h4').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'command-palette.png',
    fn: async (page) => {
      await login(page, itAdmin);
      await page.goto(`${base}/`);
      await page.getByRole('button', { name: /command palette/i }).click();
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 8_000 });
      await annotate(page, ['.ant-modal-content input, [aria-label="Global search"]']);
    },
  },
];

const only = (process.env.HELP_SHOT_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const selected = only.length ? shots.filter((s) => only.includes(s.name)) : shots;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20_000);

let failed = 0;
for (const s of selected) {
  try {
    await s.fn(page);
    await shot(page, s.name);
  } catch (e) {
    failed += 1;
    console.error('FAIL', s.name, e.message);
    try {
      await page.screenshot({ path: path.join(outDir, s.name), fullPage: false });
      console.log('SAVED_PARTIAL', s.name);
    } catch {
      /* ignore */
    }
  }
}

await browser.close();
console.log('Done →', outDir, failed ? `(${failed} failed)` : '');
if (failed) process.exitCode = 1;
