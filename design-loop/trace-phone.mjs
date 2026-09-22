import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const [url, from, to] = [process.argv[2], +process.argv[3], +process.argv[4]];
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(8000);
await p.evaluate(y => scrollTo(0, y), from); await p.waitForTimeout(1500);
await b.startTracing(p, { path: 'design-loop/trace3.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'v8.execute'] });
await p.evaluate(([a, b]) => new Promise(res => { let y = a; const step = () => { y += 22; scrollTo(0, y); if (y < b) requestAnimationFrame(step); else setTimeout(res, 800); }; requestAnimationFrame(step); }), [from, to]);
await b.stopTracing(); await b.close();
const raw = JSON.parse(fs.readFileSync('design-loop/trace3.json')); const ev = raw.traceEvents || raw;
const long = ev.filter(e => e.name === 'RunTask' && e.dur > 50000).sort((a, b) => b.dur - a.dur).slice(0, 5);
console.log('long tasks:', long.map(e => (e.dur / 1000).toFixed(0) + 'ms').join(', '));
// what ran inside the longest task
for (const L of long.slice(0, 2)) {
  const inside = ev.filter(e => e.ts >= L.ts && e.ts <= L.ts + L.dur && e.dur && e.tid === L.tid && e.name !== 'RunTask');
  const agg = {};
  for (const e of inside) { const d = e.args?.data || {}; const k = e.name + ' ' + (d.functionName || '') + ' ' + ((d.url || '').split('/').pop()) + (d.lineNumber ? ':' + d.columnNumber : ''); agg[k] = Math.max(agg[k] || 0, e.dur); }
  console.log('-- in', (L.dur / 1000).toFixed(0) + 'ms task:'); Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log('   ', (v / 1000).toFixed(0).padStart(5), 'ms', k.slice(0, 120)));
}
const lay = {}; for (const e of ev) if ((e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.dur) { const st = e.args?.beginData?.stackTrace; const k = e.name + ' ' + (st ? (st[0].functionName || 'anon') + '@' + st[0].url.split('/').pop() + ':' + st[0].columnNumber : '(natural)'); lay[k] = (lay[k] || 0) + e.dur; }
console.log('layout/style by source:'); Object.entries(lay).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log('   ', (v / 1000).toFixed(0).padStart(5), 'ms', k.slice(0, 120)));
