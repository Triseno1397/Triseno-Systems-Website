import { chromium } from '@playwright/test';
/* Phone + desktop shots of the home menu and the crystal hall.
   env: BASE, TAG */
const BASE = process.env.BASE || 'http://localhost:3302';
const tag = process.env.TAG || 'new';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
for (const [name, W, H, phone] of [['phone', 390, 844, true], ['desk', 1440, 900, false]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-home.png` });
  await p.goto(BASE + '/web-design-division', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const top = await p.evaluate(() => document.querySelector('.web-prism').getBoundingClientRect().top + scrollY);
  for (let y = 0; y < top; y += 300) { await p.evaluate((y) => window.scrollTo(0, y), Math.min(y, top)); await p.waitForTimeout(40); }
  await p.evaluate((y) => window.scrollTo(0, y), top);
  await p.waitForTimeout(5000);
  const info = await p.evaluate(() => { const c = document.querySelector('.web-prism__canvas'); return { w: c.width, h: c.height, live: document.querySelector('.web-prism').hasAttribute('data-live') }; });
  console.log(name, 'canvas', JSON.stringify(info));
  await p.screenshot({ path: `design-loop/shots/${tag}-${name}-prism.png` });
  await ctx.close();
}
await b.close();
