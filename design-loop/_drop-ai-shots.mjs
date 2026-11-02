import { chromium } from '@playwright/test';
/* Shots for the AI-removal round: the Creative landing (floor + inside a
   case), the home's demo panel and door rows, the Web Design warp. env BASE TAG */
const BASE = process.env.BASE || 'http://localhost:3302';
const tag = process.env.TAG || 'dropai';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const errs = [];
for (const [name, W, H, phone] of [['desk', 1440, 900, false], ['phone', 390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${name} console: ${m.text()}`); });
  await p.goto(BASE + '/studio', { waitUntil: 'load' });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-studio-floor.png` });
  const hit = p.locator('.sxc__hit').nth(2);
  await hit.click({ force: true });
  await p.waitForTimeout(6500);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-studio-case.png` });
  await p.keyboard.press('Escape');
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-home.png` });
  const top = await p.evaluate(() => document.querySelector('.portal-demo').getBoundingClientRect().top + scrollY);
  for (let y = 0; y <= top; y += 200) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate((y) => window.scrollTo(0, y), top);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-home-demo.png` });
  await ctx.close();
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
