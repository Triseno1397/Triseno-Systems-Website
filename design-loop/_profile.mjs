import { chromium } from '@playwright/test';
/* CPU profile of a scroll: who is burning the main thread?
   env: PAGE W H CPU. Prints top self-time functions and top files. */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4);
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
await p.waitForTimeout(3000);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const stepPx = 110; const steps = Math.ceil(total / stepPx);
for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, stepPx); await p.waitForTimeout(16); }
await p.waitForTimeout(1000);
const { profile } = await cdp.send('Profiler.stop');
// self time per node = samples * interval
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; let t = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const n = byId.get(profile.samples[i]); const d = dt[i] || 0; t += d;
  const cf = n.callFrame; const url = (cf.url || '').replace('http://localhost:3300', '').split('?')[0];
  const key = `${cf.functionName || '(anon)'} @ ${url.split('/').pop() || '(native)'}:${cf.lineNumber}`;
  self.set(key, (self.get(key) || 0) + d);
}
const totalMs = t / 1000;
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
console.log('page', page, 'profiled ms', Math.round(totalMs));
for (const [k, v] of top) console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / t).toFixed(1).padStart(5)}%  ${k}`);
// by file
const byFile = new Map();
for (const [k, v] of self) { const f = k.split(' @ ')[1].split(':')[0]; byFile.set(f, (byFile.get(f) || 0) + v); }
console.log('--- by file');
for (const [k, v] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / t).toFixed(1).padStart(5)}%  ${k}`);
await b.close();
