import { chromium } from '@playwright/test';
/* Scroll-performance trace: scroll a page top to bottom under CPU throttling
   and report long tasks, frame-time distribution and transferred bytes.
   env: PAGE=/ai-infrastructure W H CPU=4 (throttle factor) TAG */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/ai-infrastructure';
const cpu = +(process.env.CPU || 4);
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
let bytes = 0; const byType = {}; const big = [];
p.on('response', async (r) => {
  try {
    const h = r.headers(); const len = +(h['content-length'] || 0);
    const t = (h['content-type'] || '').split(';')[0];
    bytes += len; byType[t] = (byType[t] || 0) + len;
    if (len > 400_000) big.push([len, r.url().replace('http://localhost:3300', '')]);
  } catch {}
});
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.addInitScript(() => {
  window.__perf = { long: [], frames: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  let last = performance.now();
  const tick = (t) => { window.__perf.frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const t0 = Date.now();
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
const loadMs = Date.now() - t0;
// experiments: INJECT_CSS adds a stylesheet after load (e.g. to switch a feature off)
if (process.env.INJECT_CSS) await p.addStyleTag({ content: process.env.INJECT_CSS });
await p.waitForTimeout(3000);
await p.evaluate(() => { window.__perf.frames.length = 0; window.__perf.long.length = 0; window.__perf.t0 = performance.now(); });
// scroll like a person: wheel ticks, ~110px each, every 16ms, to the bottom
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const stepPx = 110; const steps = Math.ceil(total / stepPx);
for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, stepPx); await p.waitForTimeout(16); }
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const f = window.__perf.frames.slice(5);
  const sorted = [...f].sort((a, b) => a - b);
  const pct = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const over = (ms) => f.filter(x => x > ms).length;
  const dur = performance.now() - window.__perf.t0;
  const long = window.__perf.long; const longTotal = long.reduce((s, [, d]) => s + d, 0);
  return { scrollMs: Math.round(dur), frames: f.length, p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), p99: +pct(0.99).toFixed(1), max: +Math.max(...f).toFixed(0), over33: over(33), over50: over(50), over100: over(100), longTasks: long.length, longMs: Math.round(longTotal), worstLong: long.slice().sort((a, b) => b[1] - a[1]).slice(0, 5) };
});
console.log(JSON.stringify({ page, W, H, cpu, loadMs, totalBytesMB: +(bytes / 1048576).toFixed(1), byTypeMB: Object.fromEntries(Object.entries(byType).filter(([, v]) => v > 200000).map(([k, v]) => [k, +(v / 1048576).toFixed(1)])), big: big.sort((a, b) => b[0] - a[0]).slice(0, 8).map(([l, u]) => `${(l / 1048576).toFixed(1)}MB ${u}`), ...r, errors: errs }, null, 1));
await b.close();
