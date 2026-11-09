// For a saved trace (design-loop/_warp-trace.mjs OUT): every forced Layout /
// style recalc inside the renderer main thread's long tasks, with the JS
// frames that were on the stack when it started. env: TRACE, MIN (task ms)
import fs from 'node:fs';
const ev = (JSON.parse(fs.readFileSync(process.env.TRACE)).traceEvents || []).filter((e) => typeof e.ts === 'number');
const MIN = +(process.env.MIN || 50);
const threadNames = new Map();
for (const e of ev) if (e.name === 'thread_name' && e.args?.name) threadNames.set(e.pid + '/' + e.tid, e.args.name);
const count = new Map();
for (const e of ev) if (threadNames.get(e.pid + '/' + e.tid) === 'CrRendererMain' && e.cat.includes('devtools.timeline')) count.set(e.pid + '/' + e.tid, (count.get(e.pid + '/' + e.tid) || 0) + 1);
const mainKey = [...count.entries()].sort((a, c) => c[1] - a[1])[0]?.[0];
const main = ev.filter((e) => e.pid + '/' + e.tid === mainKey).sort((a, c) => a.ts - c.ts);
const nodes = new Map(); const parent = new Map(); const samples = [];
for (const e of ev) {
  if ((e.name !== 'ProfileChunk' && e.name !== 'Profile') || e.pid !== +mainKey.split('/')[0]) continue;
  const cp = e.args?.data?.cpuProfile; if (!cp) continue;
  for (const n of cp.nodes || []) { nodes.set(n.id, n); if (n.parent != null) parent.set(n.id, n.parent); for (const c of n.children || []) parent.set(c, n.id); }
  if (cp.samples) { let t = e.args.data.startTime ?? e.ts; const td = e.args.data.timeDeltas || cp.timeDeltas || []; for (let i = 0; i < cp.samples.length; i++) { t += td[i] || 0; samples.push([t, cp.samples[i]]); } }
}
samples.sort((a, c) => a[0] - c[0]);
const short = (u) => (u || '').replace(/^.*\/_next\/static\/chunks\//, '').replace(/^https?:\/\/[^/]+/, '').slice(0, 40);
const chainOf = (id) => { const out = []; let n = nodes.get(id); let g = 0; while (n && g++ < 60) { const f = n.callFrame; if (f && f.url) out.push(`${f.functionName || 'anon'}@${short(f.url)}:${f.lineNumber}`); else if (f && f.functionName && !out.length) out.push(f.functionName); n = nodes.get(parent.get(n.id)); } return out; };
let first = Infinity; for (const e of ev) if (e.ts < first) first = e.ts;
const tasks = main.filter((e) => e.name === 'RunTask' && e.dur > MIN * 1000);
for (const t of tasks) {
  const z = t.ts + t.dur;
  const top = main.find((e) => e.ts >= t.ts && e.ts < z && (e.name === 'FunctionCall' || e.name === 'TimerFire' || e.name === 'EventDispatch' || e.name === 'FireAnimationFrame' || e.name === 'FireIdleCallback'));
  const d = top?.args?.data || {};
  console.log(`\n■ task +${((t.ts - first) / 1000).toFixed(0)}ms ${(t.dur / 1000).toFixed(0)}ms  ${top?.name || ''} ${d.functionName || d.type || ''} ${short(d.url)}`);
  const forced = main.filter((e) => (e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.ts >= t.ts && e.ts + e.dur <= z && e.dur > 1500);
  for (const f of forced) {
    // the sample just before this layout began: who asked for it
    let lo = 0, hi = samples.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (samples[m][0] <= f.ts) lo = m; else hi = m - 1; }
    const ch = samples.length ? chainOf(samples[lo][1]) : [];
    // skip the generic frames so the app-level caller shows
    const app = ch.filter((c) => !/react-dom|scheduler|^\(/.test(c));
    console.log(`   ${f.name === 'Layout' ? 'LAYOUT' : 'style '} ${(f.dur / 1000).toFixed(1).padStart(6)}ms  ${app.slice(0, 4).join(' < ').slice(0, 170)}`);
  }
}
