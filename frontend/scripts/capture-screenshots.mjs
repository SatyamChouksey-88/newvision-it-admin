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
const outDir = path.join(__dirname, '../../docs/screenshots');
const base = 'http://localhost:5173';
const password = 'Password123!';

async function login(page, email) {
  await page.goto(`${base}/login`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
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
  { name: 'maintenance.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/maintenance`); } },
  { name: 'accessories.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/accessories`); } },
  { name: 'reports.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/reports`); } },
  { name: 'requests.png', fn: async (page) => { await login(page, 'employee@newvision.local'); await page.goto(`${base}/requests`); } },
  { name: 'audit-log.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/audit-logs`); } },
  { name: 'import-summary.png', fn: async (page) => { await login(page, 'itadmin@newvision.local'); await page.goto(`${base}/settings`); } },
  { name: 'notifications.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.getByRole('button', { name: /notifications/i }).click();
  }},
  { name: 'assign-modal.png', fn: async (page) => {
    await login(page, 'itadmin@newvision.local');
    await page.goto(`${base}/assets`);
    await page.getByRole('button', { name: /assign/i }).first().click();
  }},
  { name: 'scan-page.png', fn: async (page) => { await page.goto(`${base}/scan/AST-PUN-LAP-0001`); } },
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
