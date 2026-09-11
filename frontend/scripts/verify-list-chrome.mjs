/**
 * One-off visual check of list-page chrome. Not used in CI.
 *   cd frontend && node scripts/verify-list-chrome.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../test-results/list-chrome');
const base = 'http://localhost:5173';

const pages = [
  '/assets',
  '/employees',
  '/tickets',
  '/maintenance',
  '/consumables',
  '/requests',
  '/audit-logs',
  '/accessories',
];

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill('itadmin@newvision.local');
  await page.locator('#password').fill('Password123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25_000 });
}

async function shot(page, name) {
  if (page.url().includes('/accessories')) {
    const table = page.locator('.ant-segmented-item', { hasText: 'Table' });
    if (await table.isVisible().catch(() => false)) await table.click();
  }
  await page
    .locator('.ant-table-row, .nv-stock-card, .nv-grid-toolbar, .nv-filter-row')
    .first()
    .waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await mkdir(outDir, { recursive: true });
await login(page);

for (const p of pages) {
  await page.goto(`${base}${p}`, { waitUntil: 'domcontentloaded' });
  await shot(page, `${p.slice(1)}-1440.png`);
}

await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto(`${base}/tickets`, { waitUntil: 'domcontentloaded' });
await shot(page, 'tickets-1920.png');
await page.goto(`${base}/assets`, { waitUntil: 'domcontentloaded' });
await shot(page, 'assets-1920.png');

await page.setViewportSize({ width: 768, height: 900 });
await page.goto(`${base}/tickets`, { waitUntil: 'domcontentloaded' });
await shot(page, 'tickets-768.png');

await browser.close();
console.log(`Wrote screenshots to ${outDir}`);
