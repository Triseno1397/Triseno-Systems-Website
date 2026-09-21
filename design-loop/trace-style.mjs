import { chromium } from '@playwright/test';
import fs from 'fs';
const url = process.argv[2];
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(6000); await p.mouse.move(720, 450);
await b.startTracing(p, { path: 'design-loop/trace.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking', 'blink.user_timing'] });
for (let i = 0; i < 120; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(45); }
await b.stopTracing(); await b.close();
const ev = JSON.parse(fs.readFileSync('design-loop/trace.json')).traceEvents ?? JSON.parse(fs.readFileSync('design-loop/trace.json'));
const agg = {}; let styleT = 0, n = 0; const paint = {}; let paintT = 0;
for (const e of ev) {
  if (e.name === 'UpdateLayoutTree' && e.dur) { styleT += e.dur; n++; }
  if (e.name === 'Paint' && e.dur) { paintT += e.dur; }
  if (e.name === 'RasterTask' && e.dur) { paint.raster = (paint.raster || 0) + e.dur; }
  if (e.name === 'StyleRecalcInvalidationTracking' || e.name === 'StyleInvalidatorInvalidationTracking' || e.name === 'ScheduleStyleInvalidationTracking') {
    const d = e.args?.data || {}; const k = e.name.replace('InvalidationTracking','') + ' | ' + (d.reason || d.invalidationList?.map(x => x.classes || x.id || x.attribute).join(',') || d.changedClass || d.changedAttribute || d.changedPseudo || '') + ' | ' + (d.nodeName || '');
    agg[k] = (agg[k] || 0) + 1; }
}
console.log('UpdateLayoutTree total ms', (styleT / 1000).toFixed(0), 'count', n, '| Paint ms', (paintT/1000).toFixed(0), '| raster ms', ((paint.raster||0)/1000).toFixed(0));
Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(String(v).padStart(6), k.slice(0, 170)));
