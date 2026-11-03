import { chromium } from '@playwright/test';
const W = +(process.env.W || 1536), H = +(process.env.H || 864); const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage();
for (const path of ['/', '/web-design-division', '/studio']) {
  await p.goto('http://localhost:3401' + path + '?explore=off', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  console.log(path, await p.evaluate(() => [...document.querySelectorAll('main [data-rail]')].map((e) => `${e.dataset.rail}@${Math.round(e.getBoundingClientRect().top + scrollY)}+${e.offsetHeight}`).join('  ') + ' | total ' + document.documentElement.scrollHeight));
}
await b.close();
