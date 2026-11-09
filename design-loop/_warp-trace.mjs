// Where the main thread goes while the guided tour changes page under the
// warp. Starts mid-tour on FROM at stop IDX (sessionStorage), waits for the
// stop to play out and the warp to start, traces the whole warp, then breaks
// the renderer main thread's long tasks down by what ran in them (timeline
// events plus sampled stacks, by chunk). Env: BASE/PORT, FROM, IDX, W, H, CPU,
// OUT (trace json path). Run ONE browser job at a time.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const W = +(process.env.W || 390), H = +(process.env.H || 844); const phone = W < 768; const CPU = +(process.env.CPU || 4);
const FROM = process.env.FROM || '/'; const IDX = process.env.IDX || '1';
const base = process.env.BASE || 'http://localhost:' + (process.env.PORT || 3300);
const out = process.env.OUT || 'design-loop/shots/warp-trace.json';
const ANALYZE = process.env.ANALYZE;
let frames = [], stats = null, errs = [], path = '?', tw = Date.now();
if (!ANALYZE) {
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
await ctx.addInitScript(() => {
  const F = (window.__frames = []); let last = performance.now();
  const tick = (t) => { F.push([Math.round(t), Math.round(t - last), document.documentElement.hasAttribute('data-warping') ? 'w' : '-', location.pathname]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.goto(base + FROM, { waitUntil: 'load' });
await p.evaluate((i) => sessionStorage.setItem('triseno:tour', i), IDX);
await p.goto(base + FROM, { waitUntil: 'load' });
// the stop plays; the warp starts when it ends. Tracing starts once the stop
// is playing: starting the sampling profiler is itself a long interrupt on
// the main thread (it logs every compiled function), which must not land in
// the warp it is meant to measure.
const t0 = Date.now(); let warping = false; let tracing = false;
const startTrace = () => b.startTracing(p, { path: out, categories: [...(process.env.CATS ? process.env.CATS.split(',') : []), 'toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.execute', 'disabled-by-default-v8.cpu_profiler', 'blink.user_timing'] });
while (Date.now() - t0 < 40000) {
  await p.waitForTimeout(60);
  const s = await p.evaluate(() => ({ warping: document.documentElement.hasAttribute('data-warping'), phase: document.querySelector('.tour-card')?.dataset.phase })).catch(() => ({}));
  if (!tracing && s.phase === 'playing') { tracing = true; await startTrace(); }
  if (s.warping) { warping = true; break; }
}
if (!warping) { console.log('no warp started'); await b.close(); process.exit(1); }
if (!tracing) await startTrace();
tw = Date.now();
let w = true;
while (Date.now() - tw < 12000) { await p.waitForTimeout(100); w = await p.evaluate(() => document.documentElement.hasAttribute('data-warping')).catch(() => true); if (!w) break; }
await p.waitForTimeout(600);
frames = await p.evaluate(() => window.__frames.slice());
stats = await p.evaluate(() => window.__warpStats);
await b.stopTracing();
path = await p.evaluate(() => location.pathname);
await b.close();
}

console.log(`warp ${FROM} (stop ${IDX}) -> ${path}  ${W}x${H} cpu x${CPU}  warp ${Date.now() - tw - 600} ms wall`, errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
console.log('warp stats (tunnel thread):', JSON.stringify(stats));
const fd = frames.map((f) => f[1]).sort((a, c) => a - c);
console.log(`main-thread rAF frames during warp: n=${fd.length} p50=${fd[fd.length >> 1]} max=${fd[fd.length - 1]}  worst:`, frames.slice().sort((a, c) => c[1] - a[1]).slice(0, 6).map((f) => `${f[1]}ms@${f[3]}`).join(' '));

/* ── the trace ───────────────────────────────────────────────────────── */
const ev = (JSON.parse(fs.readFileSync(ANALYZE || out)).traceEvents || []).filter((e) => typeof e.ts === 'number');
const threadNames = new Map();
for (const e of ev) if (e.name === 'thread_name' && e.args?.name) threadNames.set(e.pid + '/' + e.tid, e.args.name);
// the page's renderer main thread: the CrRendererMain with the most timeline events
const count = new Map();
for (const e of ev) if (threadNames.get(e.pid + '/' + e.tid) === 'CrRendererMain' && e.cat.includes('devtools.timeline')) count.set(e.pid + '/' + e.tid, (count.get(e.pid + '/' + e.tid) || 0) + 1);
const mainKey = [...count.entries()].sort((a, c) => c[1] - a[1])[0]?.[0];
const main = ev.filter((e) => e.pid + '/' + e.tid === mainKey).sort((a, c) => a.ts - c.ts);
let first = Infinity; for (const e of ev) if (e.ts < first) first = e.ts;
const ms = (ts) => ((ts - first) / 1000).toFixed(0);

// sampled stacks (cpu profiler): nodes + samples with absolute timestamps
const nodes = new Map(); const parent = new Map(); const samples = [];
for (const e of main.concat(ev.filter((e) => e.pid + '/' + e.tid !== mainKey))) {
  if (e.name !== 'ProfileChunk' && e.name !== 'Profile') continue;
  if (e.pid !== +mainKey.split('/')[0]) continue;
  const cp = e.args?.data?.cpuProfile; if (!cp) continue;
  for (const n of cp.nodes || []) { nodes.set(n.id, n); if (n.parent != null) parent.set(n.id, n.parent); for (const c of n.children || []) parent.set(c, n.id); }
  if (cp.samples) { let t = e.args.data.startTime ?? e.ts; const td = e.args.data.timeDeltas || cp.timeDeltas || []; for (let i = 0; i < cp.samples.length; i++) { t += td[i] || 0; samples.push([t, cp.samples[i]]); } }
}
samples.sort((a, c) => a[0] - c[0]);
const short = (u) => (u || '').replace(/^.*\/_next\/static\/chunks\//, '').replace(/^.*\/_next\//, '_next/').replace(/^https?:\/\/[^/]+/, '').slice(0, 60);
const chainOf = (id) => { const out = []; let n = nodes.get(id); let guard = 0; while (n && guard++ < 40) { const f = n.callFrame; if (f && f.url) out.push(`${f.functionName || 'anon'}@${short(f.url)}:${f.lineNumber}`); else if (f && f.functionName && !out.length) out.push(f.functionName); n = nodes.get(parent.get(n.id)); } return out; };

// tasks from 1.5 s before the warp began (the frame log marks the warp with 'w')
const warpAt = frames.find((f) => f[2] === 'w')?.[0];
const nav = ANALYZE ? 0 : (await Promise.resolve(0), 0);
void nav;
const tasks = main.filter((e) => e.name === 'RunTask' && e.dur > 50000).sort((a, c) => a.ts - c.ts);
console.log(warpAt ? `(warp began at frame-clock ${warpAt} ms; tasks are listed from the trace start)` : '');
console.log(`\nmain thread: ${tasks.length} tasks over 50 ms during the warp (profile samples: ${samples.length})`);
for (const t of tasks) {
  const z = t.ts + t.dur;
  console.log(`\n■ task +${ms(t.ts)}ms  ${(t.dur / 1000).toFixed(0)} ms`);
  // timeline children, by kind
  const kids = main.filter((e) => e.dur && e.ts >= t.ts && e.ts + e.dur <= z && e !== t && !['RunTask', 'ThreadControllerImpl::RunTask', 'ProfileChunk'].includes(e.name));
  const tally = new Map();
  for (const e of kids) {
    const d = e.args?.data || {};
    let k = e.name;
    if (e.name === 'FunctionCall' || e.name === 'EvaluateScript' || e.name === 'v8.compile' || e.name === 'v8.compileModule') k += ' ' + (d.functionName ? d.functionName + ' ' : '') + short(d.url) + (d.lineNumber ? ':' + d.lineNumber : '');
    if (e.name === 'TimerFire' || e.name === 'TimerInstall') k += ' id' + d.timerId;
    if (e.name === 'EventDispatch') k += ' ' + d.type;
    // only count top-level-ish children: those not nested in another counted child of the same name
    tally.set(k, (tally.get(k) || 0) + e.dur);
  }
  const rows = [...tally.entries()].sort((a, c) => c[1] - a[1]).slice(0, 10);
  for (const [k, v] of rows) console.log('   ', (v / 1000).toFixed(0).padStart(5) + 'ms', k.slice(0, 120));
  // sampled stacks inside the task: self time by chunk, and by the nearest app frame
  const inside = samples.filter((s) => s[0] >= t.ts && s[0] <= z);
  if (!inside.length) continue;
  const per = (z - t.ts) / inside.length / 1000;
  const byChunk = new Map(); const byChain = new Map();
  for (const [, id] of inside) {
    const ch = chainOf(id);
    const chunk = (ch.find((c) => c.includes('@')) || ch[0] || '(native)').split('@').pop()?.split(':')[0] || '(native)';
    byChunk.set(chunk, (byChunk.get(chunk) || 0) + per);
    const key = ch.slice(0, 3).join(' < ') || '(native)';
    byChain.set(key, (byChain.get(key) || 0) + per);
  }
  console.log('    by chunk:', [...byChunk.entries()].sort((a, c) => c[1] - a[1]).slice(0, 6).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join(' | '));
  for (const [k, v] of [...byChain.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8)) console.log('     ', v.toFixed(0).padStart(5) + 'ms', k.slice(0, 150));
}
// user timing marks and navigation-ish events, for the timeline of the warp
const marks = main.filter((e) => e.cat.includes('user_timing') || e.name === 'CommitLoad' || e.name === 'ResourceSendRequest').slice(0, 0);
void marks;
