import { chromium } from '@playwright/test';

/* Who measures layout during a scroll, and how often.
   Wraps getBoundingClientRect before the page loads and tallies callers.
   Run against dev so the stacks carry real names:
     node design-loop/rect-callers.mjs http://localhost:3200/ [startY] */

const url = process.argv[2] || 'http://localhost:3200/';
const from = Number(process.argv[3] || 0);

const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => {
  const w = window;
  w.__rects = new Map();
  w.__counting = false;
  const wrap = (proto, name) => {
    const orig = proto[name];
    proto[name] = function (...args) {
      if (w.__counting) {
        const line = (new Error().stack || '').split('\n')[2] || '?';
        const key = line.trim().replace(/^at\s+/, '').replace(/\(.*\/([^/]+)\)$/, '$1').slice(0, 110);
        w.__rects.set(key, (w.__rects.get(key) || 0) + 1);
      }
      return orig.apply(this, args);
    };
  };
  wrap(Element.prototype, 'getBoundingClientRect');
  wrap(Range.prototype, 'getBoundingClientRect');
});
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(9000);
if (from) {
  await p.evaluate((y) => window.scrollTo(0, y), from);
  await p.waitForTimeout(1500);
}
await p.mouse.move(720, 450);
await p.evaluate(() => {
  window.__rects.clear();
  window.__counting = true;
  window.__t0 = performance.now();
});
for (let i = 0; i < 100; i++) {
  await p.mouse.wheel(0, 100);
  await p.waitForTimeout(45);
}
const out = await p.evaluate(() => {
  window.__counting = false;
  const secs = (performance.now() - window.__t0) / 1000;
  const frames = Math.round(secs * 60);
  return {
    secs,
    frames,
    rows: [...window.__rects.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16),
    total: [...window.__rects.values()].reduce((a, c) => a + c, 0),
  };
});
await b.close();
console.log(`\n${url}  —  ${out.secs.toFixed(1)}s of scrolling, ~${out.frames} frames`);
console.log(`getBoundingClientRect: ${out.total} calls  (${(out.total / out.frames).toFixed(1)} per frame)\n`);
for (const [k, v] of out.rows) console.log('  ', String(v).padStart(6), (v / out.frames).toFixed(1).padStart(6) + '/frame ', k);
