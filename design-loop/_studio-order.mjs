import { chromium } from '@playwright/test';
/* Creative page: the showreel hero first, then the gallery in the Formats
   slot (floor, then inside a case). env BASE TAG */
const BASE = process.env.BASE || 'http://localhost:3302';
const tag = process.env.TAG || 'order';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const errs = [];
for (const [name, W, H, phone] of [['desk', 1440, 900, false], ['phone', 390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${name}: ${e.message}`));
  await p.goto(BASE + '/studio', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-hero.png` });
  const order = await p.evaluate(() => [...document.querySelectorAll('main [data-rail]')].map((e) => e.getAttribute('data-rail')).join(' > '));
  console.log(name, order);
  const top = await p.evaluate(() => document.querySelector('.sxc').getBoundingClientRect().top + scrollY);
  for (let y = 0; y <= top; y += 150) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(50); }
  await p.evaluate((y) => window.scrollTo(0, y), top);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-floor.png` });
  await p.locator('.sxc__hit').nth(1).click({ force: true });
  await p.waitForTimeout(6500);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-case.png` });
  await ctx.close();
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
