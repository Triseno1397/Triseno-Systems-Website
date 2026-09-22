import { chromium } from '@playwright/test';
import fs from 'fs';
const url = process.argv[2];
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(7000); if (process.env.FROM) { await p.evaluate(y => window.scrollTo(0, y), Number(process.env.FROM)); await p.waitForTimeout(1500); } await p.mouse.move(720, 450);
await b.startTracing(p, { path: 'design-loop/trace2.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'v8.execute'] });
for (let i = 0; i < Number(process.env.STEPS || 160); i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(45); }
await b.stopTracing(); await b.close();
const raw = JSON.parse(fs.readFileSync('design-loop/trace2.json')); const ev = raw.traceEvents || raw;
// forced layouts with JS stacks, and top-level heavy tasks
const forced = {}; const fn = {}; const tasks = [];
for (const e of ev) {
  if (e.name === 'UpdateLayoutTree' && e.args?.beginData?.stackTrace?.length) { const f = e.args.beginData.stackTrace[0]; const k = 'STYLE ' + (f.functionName || '(anon)') + ' ' + f.url.split('/').pop() + ':' + f.lineNumber + ':' + f.columnNumber; forced[k] = (forced[k] || 0) + (e.dur || 0); }
  if (e.name === 'Layout' && e.args?.beginData?.stackTrace?.length) { const f = e.args.beginData.stackTrace[0]; const k = (f.functionName || '(anon)') + ' ' + f.url.split('/').pop() + ':' + f.lineNumber; forced[k] = (forced[k] || 0) + (e.dur || 0); }
  if (e.name === 'FunctionCall' && e.dur > 2000) { const d = e.args?.data || {}; const k = (d.functionName || '(anon)') + ' ' + (d.url || '').split('/').pop() + ':' + d.lineNumber; fn[k] = (fn[k] || 0) + e.dur; }
  if (e.name === 'RunTask' && e.dur > 20000) tasks.push(e.dur);
}
console.log('forced layouts (ms):'); Object.entries(forced).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log('  ', (v / 1000).toFixed(1), k));
console.log('heavy fn calls (ms):'); Object.entries(fn).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log('  ', (v / 1000).toFixed(1), k));
console.log('tasks >20ms:', tasks.length, tasks.map(t => (t / 1000).toFixed(0)).join(','));
