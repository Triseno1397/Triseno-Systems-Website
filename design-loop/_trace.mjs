import { chromium } from '@playwright/test';
/* Where does the renderer's main thread go? A devtools trace of N seconds
   (idle by default, or scrolling with SCROLL=1), summed by event name.
   env: PAGE W H CPU SCROLL */
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4);
const scroll = process.env.SCROLL === '1';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
await p.waitForTimeout(6000);
const events = [];
cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.console', transferMode: 'ReportEvents' });
if (scroll) {
  for (let i = 0; i < 180; i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(16); }
} else {
  await p.waitForTimeout(4000);
}
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.end');
await done;
// the renderer main thread: the one with the most X events
const byThread = new Map();
for (const e of events) if (e.ph === 'X' && e.dur) { const k = `${e.pid}:${e.tid}`; byThread.set(k, (byThread.get(k) || 0) + 1); }
const main = [...byThread.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
const sum = new Map(); let total = 0; let t0 = Infinity, t1 = -Infinity;
const topLevel = new Set(['RunTask', 'ThreadControllerImpl::RunTask', 'MessageLoop::RunTask']);
for (const e of events) {
  if (e.ph !== 'X' || !e.dur) continue;
  if (`${e.pid}:${e.tid}` !== main) continue;
  t0 = Math.min(t0, e.ts); t1 = Math.max(t1, e.ts + e.dur);
  if (topLevel.has(e.name)) continue;
  sum.set(e.name, (sum.get(e.name) || 0) + e.dur);
}
const span = (t1 - t0) / 1000;
const rows = [...sum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log(`page ${page} W ${W} ${scroll ? 'SCROLL' : 'IDLE'} span ${Math.round(span)} ms (self-inclusive sums; nested events overlap)`);
for (const [k, v] of rows) console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / 1000 / span).toFixed(1).padStart(5)}%  ${k}`);
// frames: how many DrawFrame / dropped
const frames = events.filter(e => e.name === 'DrawFrame' && `${e.pid}` === main.split(':')[0]).length;
console.log('DrawFrame events on this process:', frames, 'over', Math.round(span), 'ms');
await b.close();
