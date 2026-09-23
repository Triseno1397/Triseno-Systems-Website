import { chromium } from '@playwright/test';
import fs from 'node:fs';

/* What stops frames being drawn across a link hop. Traces the click, finds
   the longest interval between presented frames, and tallies what ran inside
   it — on every thread, not just the main one.
   node design-loop/hop-trace.mjs [from] [selector] */

const base = process.env.BASE || 'http://localhost:3300';
const from = process.argv[2] || '/';
const sel = process.argv[3] || 'a[href="/studio"]';
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(60000);
await p.goto(base + from, { waitUntil: 'load' });
await p.waitForTimeout(9000);
await b.startTracing(p, {
  path: 'design-loop/trace-hop.json',
  categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'gpu', 'cc', 'viz', 'blink', 'v8.execute', 'disabled-by-default-devtools.timeline.invalidationTracking'],
});
const t0 = Date.now();
await p.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
await p.waitForTimeout(600);
const before = p.url();
await p.locator(sel).first().click({ force: true });
const navigated = await p.waitForFunction((b) => location.href !== b, before, { timeout: 8000 }).then(() => true).catch(() => false);
await p.waitForTimeout(5500);
if (!navigated) { console.log("the click did not navigate (still at " + p.url() + ") - nothing to read"); await b.close(); process.exit(1); }
await b.stopTracing();
await b.close();

const ev = (JSON.parse(fs.readFileSync('design-loop/trace-hop.json')).traceEvents || []).filter((e) => typeof e.ts === 'number');
let first = Infinity;
for (const e of ev) if (e.ts < first) first = e.ts;
const ms = (ts) => Math.round((ts - first) / 1000);
// presented frames: one thread's DrawFrame markers only, so the gap is real
// and not two processes' clocks disagreeing
const byTid = new Map();
for (const e of ev) if (e.name === 'DrawFrame') { if (!byTid.has(e.tid)) byTid.set(e.tid, []); byTid.get(e.tid).push(e.ts); }
let drawn = [];
for (const arr of byTid.values()) if (arr.length > drawn.length) drawn = arr;
drawn.sort((a, c) => a - c);
let gapStart = 0, gapEnd = 0;
for (let i = 1; i < drawn.length; i++) if (drawn[i] - drawn[i - 1] > gapEnd - gapStart) { gapStart = drawn[i - 1]; gapEnd = drawn[i]; }
console.log('\nhop ' + from + ' -> ' + sel + ':  ' + drawn.length + ' frame markers; longest gap ' + Math.round((gapEnd - gapStart) / 1000) + 'ms, from +' + ms(gapStart) + 'ms to +' + ms(gapEnd) + 'ms after tracing began');
// what ran inside the gap, by thread and event name, with duration
const inside = ev.filter((e) => e.dur && e.ts >= gapStart - 20000 && e.ts <= gapEnd);
const tally = new Map();
for (const e of inside) {
  const d = e.args && e.args.data ? e.args.data : {};
  const extra = d.functionName ? ' ' + d.functionName + ' ' + (d.url || '').split('/').pop() + ':' + d.lineNumber : d.type ? ' ' + d.type : '';
  const key = (e.cat.includes('gpu') ? 'GPU ' : '') + e.name + extra;
  tally.set(key, (tally.get(key) || 0) + e.dur);
}
console.log('inside that gap (ms of wall time, by event):');
for (const [k, v] of [...tally.entries()].sort((a, c) => c[1] - a[1]).slice(0, 18)) console.log('  ', (v / 1000).toFixed(0).padStart(6) + 'ms', k.slice(0, 110));
// and the single longest events of any kind across the whole hop
const threadNames = new Map();
for (const e of ev) if (e.name === 'thread_name' && e.args && e.args.name) threadNames.set(e.pid + '/' + e.tid, e.args.name);
console.log('longest single events across the hop (thread in brackets):');
const big = [...ev].filter((e) => e.dur > 40000).sort((a, c) => c.dur - a.dur).slice(0, 10);
if (!big.length) console.log("   (none over 40ms)");
for (const e of big) {
  const d = e.args && e.args.data ? e.args.data : {};
  console.log('  ', (e.dur / 1000).toFixed(0).padStart(6) + 'ms', '+' + ms(e.ts) + 'ms', e.name, (d.functionName || d.type || ''), '[' + (threadNames.get(e.pid + '/' + e.tid) || 'tid ' + e.tid) + ']');
}
