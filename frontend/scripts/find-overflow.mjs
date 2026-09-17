import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const res = await page.request.post('http://localhost:3000/api/auth/login', {
  data: { email: 'employee@newvision.local', password: 'Password123!' },
});
const { access_token, user } = await res.json();
await page.addInitScript(
  ({ token, userJson }) => {
    sessionStorage.setItem('newvision:token', token);
    sessionStorage.setItem('newvision:user', userJson);
  },
  { token: access_token, userJson: JSON.stringify(user) },
);
await page.goto('http://localhost:5173/');
await page.waitForSelector('[data-testid="my-it-home"]');
const offenders = await page.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      out.push({
        tag: el.tagName,
        class: el.className?.toString?.().slice(0, 80),
        right: Math.round(r.right),
        left: Math.round(r.left),
        w: Math.round(r.width),
      });
    }
  }
  return out.slice(0, 15);
});
const navCount = await page.locator('.nv-employee-bottom-nav').count();
const helpDisplay = await page
  .locator('[aria-label="Help and documentation"]')
  .evaluate((el) => getComputedStyle(el).display)
  .catch(() => 'missing');
console.log('bottomNav', navCount, 'helpDisplay', helpDisplay);
console.log('innerWidth', 390, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth));
console.log(JSON.stringify(offenders, null, 2));
await browser.close();
