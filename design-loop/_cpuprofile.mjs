import { chromium } from '@playwright/test';
/* Where does the JS go while scrolling? A V8 CPU profile of a person-speed
   scroll down the page, summed by self time per function (name + file:line),
   so a frame cost can be put on a component. Best on an unminified build
   (NO_MINIFY=1 next build). env PORT PAGE W H CPU TOP */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4); const phone = W < 768; const top = +(process.env.TOP || 40);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.goto('http://localhost:' + (process.env.PORT || 3300) + page + '?explore=off', { waitUntil: 'load' });
await p.waitForTimeout(4000);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const t0 = Date.now();
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < Math.ceil(total / 110); i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(16); }
await p.waitForTimeout(500);
const wall = Date.now() - t0;
const { profile } = await cdp.send('Profiler.stop');
await b.close();
// self time per node = samples * interval
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; let sum = 0;
for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const d = dt[i] || 0; sum += d; const cf = n.callFrame; const key = `${cf.functionName || '(anon)'}  ${cf.url.replace(/^.*\/_next\//, '').replace(/^.*localhost:\d+/, '')}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + d); }
console.log(`${page} ${W}x${H} cpu${cpu}: ${Math.round(sum / 1000)} ms sampled over ${wall} ms wall`);
// CALLERS=fn1,fn2: who calls these (the nearest named frames up the stack)
if (process.env.CALLERS) {
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const want = new Set(process.env.CALLERS.split(','));
  const chains = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]);
    if (!want.has(n.callFrame.functionName)) continue;
    const names = []; let id = n.id;
    while (id != null && names.length < 7) { const m = byId.get(id); const f = m.callFrame.functionName; if (f && f !== n.callFrame.functionName) names.push(f); id = parent.get(id); }
    const k = n.callFrame.functionName + ' <- ' + names.join(' <- ');
    chains.set(k, (chains.get(k) || 0) + (dt[i] || 0));
  }
  for (const [k, v] of [...chains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${String(Math.round(v / 1000)).padStart(6)} ms  ${k}`);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
for (const [k, v] of rows) console.log(`${String(Math.round(v / 1000)).padStart(6)} ms  ${(100 * v / sum).toFixed(1).padStart(5)}%  ${k}`);
