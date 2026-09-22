import { chromium, devices } from '@playwright/test';
/* The portal gate, where the beams fall — for before/after comparison. */
const BASE = process.env.BASE || 'http://localhost:3300';
const phone = process.env.PHONE === '1';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(150000);
await p.goto(BASE + '/', { waitUntil: 'load' });
await p.waitForTimeout(11000);
await p.evaluate(() => {
  const el = document.querySelector('[data-rail="Gate"]');
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY);
});
await p.waitForTimeout(Number(process.env.SETTLE || 4000));
await p.screenshot({ path: `design-loop/shots/gate-${process.env.TAG || 'x'}.png` });
await b.close();
console.log('ok');
