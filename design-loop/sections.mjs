import { chromium, devices } from '@playwright/test';
/* Where each section starts on a page — for aiming the profiler at one of them.
   node design-loop/sections.mjs /studio [dev|prod] */
const route = process.argv[2] || '/';
const base = process.argv[3] === 'dev' ? 'http://localhost:3200' : (process.env.BASE || 'http://localhost:3300');
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext(process.env.PHONE === '1' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(150000);
await p.goto(base + route, { waitUntil: 'load' });
await p.waitForTimeout(8000);
const rows = await p.evaluate(() => {
  const list = [...document.querySelectorAll('main section, main [data-rail]')].filter((el) => el.getBoundingClientRect().height > 200);
  const seen = new Set();
  const res = [];
  for (const el of list) {
    const r = el.getBoundingClientRect();
    const name = el.getAttribute('data-rail') || el.getAttribute('aria-label') || el.tagName;
    const top = Math.round(r.top + scrollY);
    if (seen.has(name)) continue;
    seen.add(name);
    res.push({ name, top, height: Math.round(r.height) });
  }
  return res;
});
console.table(rows);
await b.close();
