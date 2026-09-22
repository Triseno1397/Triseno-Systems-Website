import { chromium, devices } from '@playwright/test';
/* Screenshots of one route at given scroll positions:
   node design-loop/at.mjs /studio 0,5000,9000 tag */
const route = process.argv[2] || '/';
const ys = (process.argv[3] || '0').split(',').map(Number);
const tag = process.argv[4] || 'at';
const phone = process.env.PHONE === '1';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(150000);
await p.goto((process.env.BASE || 'http://localhost:3300') + route, { waitUntil: 'load' });
await p.waitForTimeout(8000);
for (const y of ys) {
  await p.evaluate((v) => window.scrollTo(0, v), y);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `design-loop/shots/${tag}-${y}.png` });
}
await b.close();
console.log('ok');
