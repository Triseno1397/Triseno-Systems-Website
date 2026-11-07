import { chromium } from '@playwright/test';
/* Why does the page recalculate style while scrolling? A trace with style
   invalidation tracking on, summed by reason: which inline-style writes,
   class/attribute flips and selectors cause recalcs, and how wide each
   UpdateLayoutTree is (elements per pass). env PORT PAGE W H CPU */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4); const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.goto('http://localhost:' + (process.env.PORT || 3403) + page + '?explore=off', { waitUntil: 'load' });
await p.waitForTimeout(4000);
const events = [];
cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < Math.ceil(total / 110); i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(16); }
await p.waitForTimeout(500);
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.end');
await done;
await b.close();
const count = (m, k, v = 1) => m.set(k, (m.get(k) || 0) + v);
const recalc = new Map(), sched = new Map(), invs = new Map();
let passes = 0, elements = 0, recalcMs = 0, layoutMs = 0, layouts = 0;
const widths = [];
for (const e of events) {
  const d = e.args?.data || {};
  if (e.name === 'UpdateLayoutTree' && e.ph === 'X') { passes++; elements += d.elementCount || 0; widths.push(d.elementCount || 0); recalcMs += e.dur / 1000; }
  if (e.name === 'Layout' && e.ph === 'X') { layouts++; layoutMs += e.dur / 1000; }
  if (e.name === 'StyleRecalcInvalidationTracking') count(recalc, `${d.reason}  <${(d.nodeName || '').slice(0, 40)}>  ${(d.extraData || '').slice(0, 50)}`);
  if (e.name === 'ScheduleStyleInvalidationTracking') count(sched, `${d.reason}  <${(d.nodeName || '').slice(0, 40)}>  ${d.changedClass || d.changedAttribute || d.changedId || d.changedPseudo || ''}`);
  if (e.name === 'StyleInvalidatorInvalidationTracking') count(invs, `${d.reason}  <${(d.nodeName || '').slice(0, 40)}>  ${(d.selectorPart || '')}`);
}
widths.sort((a, b) => b - a);
console.log(`${page} ${W}x${H}: ${passes} style passes, ${recalcMs.toFixed(0)} ms, ${elements} elements (widest ${widths.slice(0, 8).join(' ')}); ${layouts} layouts, ${layoutMs.toFixed(0)} ms`);
const show = (title, m, n = 18) => { console.log(`-- ${title}`); for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log(`${String(v).padStart(6)}  ${k}`); };
show('recalc reasons (per element)', recalc);
show('scheduled invalidations (class / attribute flips)', sched);
show('selector invalidations', invs, 12);
