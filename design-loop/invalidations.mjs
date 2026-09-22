import { chromium } from '@playwright/test';
import fs from 'node:fs';

/* What is invalidating style and layout during a scroll, straight from the
   browser: the node, and the reason it was marked dirty.
   node design-loop/invalidations.mjs <url> [startY] [steps] */

const url = process.argv[2];
const from = Number(process.argv[3] || 0);
const steps = Number(process.argv[4] || 45);

const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(7000);
if (from) {
  await p.evaluate((y) => window.scrollTo(0, y), from);
  await p.waitForTimeout(1500);
}
await p.mouse.move(720, 450);
await b.startTracing(p, {
  path: 'design-loop/trace-inval.json',
  categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking'],
});
for (let i = 0; i < steps; i++) {
  await p.mouse.wheel(0, 100);
  await p.waitForTimeout(45);
}
await b.stopTracing();
await b.close();

const ev = JSON.parse(fs.readFileSync('design-loop/trace-inval.json')).traceEvents || [];
const tally = (name) => {
  const m = new Map();
  for (const e of ev) {
    if (e.name !== name) continue;
    const d = e.args?.data || {};
    const key = `${d.reason || d.changedAttribute || '?'}  <${(d.nodeName || '').split(' ')[0]}>  ${(d.changedId || d.changedClassName || '').slice(0, 40)}`;
    m.set(key, (m.get(key) || 0) + 1);
  }
  return [...m.entries()].sort((a, c) => c[1] - a[1]).slice(0, 12);
};
for (const name of ['LayoutInvalidationTracking', 'ScheduleStyleInvalidationTracking', 'StyleRecalcInvalidationTracking']) {
  const rows = tally(name);
  if (!rows.length) continue;
  console.log('\n' + name + ':');
  for (const [k, v] of rows) console.log('  ', String(v).padStart(5), k);
}
