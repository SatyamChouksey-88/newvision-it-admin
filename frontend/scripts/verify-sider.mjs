import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../test-results/sider');
const base = 'http://localhost:5173';

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

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await login(desktop);
await desktop.goto(`${base}/tickets`, { waitUntil: 'domcontentloaded' });
await desktop.getByTestId('app-sider').waitFor();
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: path.join(outDir, 'tickets-expanded-1440.png') });
await desktop.getByTestId('sider-toggle').click();
await desktop.waitForTimeout(300);
await desktop.screenshot({ path: path.join(outDir, 'tickets-collapsed-1440.png') });
await desktop.getByTestId('sider-toggle').click();
await desktop.goto(`${base}/assets`, { waitUntil: 'domcontentloaded' });
await desktop.locator('.ant-table-row, .nv-grid-toolbar').first().waitFor({ timeout: 20_000 });
await desktop.waitForTimeout(600);
await desktop.screenshot({ path: path.join(outDir, 'assets-expanded-1440.png') });

const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await admin.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
await admin.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await admin.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
await admin.locator('#email').fill('superadmin@newvision.local');
await admin.locator('#password').fill('Password123!');
await admin.getByRole('button', { name: /sign in/i }).click();
await admin.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25_000 });
await admin.getByTestId('app-sider').waitFor();
await admin.waitForTimeout(400);
await admin.screenshot({ path: path.join(outDir, 'superadmin-expanded-1440.png') });
await admin.getByTestId('sider-toggle').click();
await admin.waitForTimeout(300);
await admin.screenshot({ path: path.join(outDir, 'superadmin-collapsed-1440.png') });

const tablet = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await login(tablet);
await tablet.getByTestId('app-sider').waitFor();
await tablet.waitForTimeout(400);
await tablet.screenshot({ path: path.join(outDir, 'tablet-1000-collapsed.png') });
await tablet.getByTestId('sider-toggle').click();
await tablet.waitForTimeout(300);
await tablet.screenshot({ path: path.join(outDir, 'tablet-1000-expanded.png') });

await browser.close();
console.log(`Wrote ${outDir}`);
