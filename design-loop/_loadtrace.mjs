import { chromium } from '@playwright/test';
/* The first seconds of a load, as the renderer main thread saw them:
   top-level task durations by name per 500 ms bucket, plus the biggest single
   tasks. env: PAGE W H CPU NET */
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4);
const net = process.env.NET || 'slow4g';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await cdp.send('Network.enable');
if (net === 'slow4g') await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
// HEAD_CSS: a stylesheet injected into the document's <head> before it parses
if (process.env.HEAD_CSS) await p.route('**/*', async (route) => {
  const req = route.request();
  if (req.resourceType() !== 'document') return route.continue();
  const res = await route.fetch();
  const html = (await res.text()).replace('<head>', '<head><style>' + process.env.HEAD_CSS + '</style>');
  await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(html)) } });
});
if (process.env.BLOCK_FONTS) await p.route('**/*.woff2', (route) => route.abort());
const events = [];
cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,loading', transferMode: 'ReportEvents' });
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
await p.waitForTimeout(6000);
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.end');
await done;
const nav = events.find(e => e.name === 'navigationStart' && e.args?.data?.isLoadingMainFrame !== false);
const t0 = nav ? nav.ts : Math.min(...events.filter(e => e.ts).map(e => e.ts));
const fp = events.find(e => e.name === 'firstPaint'); const fcp = events.find(e => e.name === 'firstContentfulPaint');
const byThread = new Map();
for (const e of events) if (e.ph === 'X' && e.dur) { const k = `${e.pid}:${e.tid}`; byThread.set(k, (byThread.get(k) || 0) + e.dur); }
const main = [...byThread.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
const INTERESTING = new Set(['ParseHTML', 'EvaluateScript', 'UpdateLayoutTree', 'Layout', 'Paint', 'Layerize', 'PrePaint', 'FunctionCall', 'TimerFire', 'FireAnimationFrame', 'v8.compile', 'ParseAuthorStyleSheet', 'ImageDecodeTask', 'Commit', 'RunMicrotasks', 'EventDispatch', 'HitTest']);
const buckets = new Map(); const big = [];
for (const e of events) {
  if (e.ph !== 'X' || !e.dur || `${e.pid}:${e.tid}` !== main) continue;
  if (!INTERESTING.has(e.name)) continue;
  const start = (e.ts - t0) / 1000; const dur = e.dur / 1000;
  if (start < 0 || start > 6000) continue;
  const bk = Math.floor(start / 500) * 500;
  if (!buckets.has(bk)) buckets.set(bk, new Map());
  const m = buckets.get(bk); m.set(e.name, (m.get(e.name) || 0) + dur);
  if (dur > 60) big.push([Math.round(start), Math.round(dur), e.name, (e.args?.data?.url || e.args?.data?.functionName || '').toString().split('/').pop().slice(0, 28)]);
}
console.log(`page ${page} W ${W} cpu ${cpu} ${net} | first-paint ${fp ? Math.round((fp.ts - t0) / 1000) : '?'} ms | FCP ${fcp ? Math.round((fcp.ts - t0) / 1000) : '?'} ms`);
for (const [bk, m] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
  const row = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
  console.log(`${String(bk).padStart(5)}-${String(bk + 500).padEnd(5)} ${row}`);
}
console.log('-- biggest tasks (start ms, dur ms):'); for (const r of big.sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log('  ', r.join('  '));
await b.close();
