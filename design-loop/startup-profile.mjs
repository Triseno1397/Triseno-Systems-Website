import { chromium } from '@playwright/test';

/* Where the time goes from navigation to the world being on screen: every
   resource in the order it finished, every long task, and the marks.
   node design-loop/startup-profile.mjs [route] */

const base = process.env.BASE || 'http://localhost:3300';
const route = process.argv[2] || '/';
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
if (process.env.JS) await p.addInitScript(process.env.JS);
p.setDefaultTimeout(150000);
await p.addInitScript(() => {
  const t0 = performance.timeOrigin;
  window.__marks = [];
  window.__long = [];
  const seen = {};
  const mark = (what) => {
    if (seen[what]) return;
    seen[what] = true;
    window.__marks.push([what, Math.round(performance.now())]);
  };
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
  } catch {}
  const mo = new MutationObserver(() => {
    if (document.querySelector('canvas')) mark('first canvas');
    const world = document.querySelector('[data-world-layer]');
    if (world && world.hasAttribute('data-scene-ready')) mark('scene ready');
    const loader = document.querySelector('.world-loader');
    if (loader) seen.__loader = true;
    if (loader && loader.hasAttribute('data-leaving')) mark('loader leaving');
    if (!loader && seen.__loader) mark('loader gone');
    if (document.documentElement && document.documentElement.hasAttribute('data-content-fade')) mark('hydrated');
  });
  mo.observe(document, { subtree: true, childList: true, attributes: true });
});
await p.goto(base + route, { waitUntil: 'commit' });
await p.waitForTimeout(12000);
const out = await p.evaluate(() => {
  const res = performance.getEntriesByType('resource').map((e) => ({
    name: e.name.replace(/^https?:\/\/[^/]+/, '').split('?')[0],
    kb: Math.round(e.transferSize / 1024),
    start: Math.round(e.startTime),
    end: Math.round(e.responseEnd),
    type: e.initiatorType,
  }));
  const nav = performance.getEntriesByType('navigation')[0];
  return {
    marks: window.__marks,
    long: window.__long,
    res: res.sort((a, c) => a.end - c.end),
    ttfb: Math.round(nav.responseStart),
    domInteractive: Math.round(nav.domInteractive),
  };
});
await b.close();

console.log('\nSTARTUP ' + route + '   ttfb ' + out.ttfb + 'ms   domInteractive ' + out.domInteractive + 'ms');
console.log('marks:');
for (const [what, t] of out.marks) console.log('  ', String(t).padStart(6), what);
console.log('long tasks (>50ms), start -> duration:');
for (const [s, d] of out.long.filter(([, d]) => d >= 50)) console.log('  ', String(s).padStart(6), String(d).padStart(5) + 'ms');
console.log('resources in the order they finished (start -> end, size):');
let total = 0;
for (const r of out.res) {
  total += r.kb;
  if (r.kb >= 20 || r.end > 1500) console.log('  ', String(r.start).padStart(6), '->', String(r.end).padStart(6), String(r.kb).padStart(6) + 'KB', r.type.padEnd(7), r.name.slice(-52));
}
console.log('  total transferred: ' + total + 'KB over ' + out.res.length + ' requests');
