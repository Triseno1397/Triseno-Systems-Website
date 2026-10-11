import { chromium } from '@playwright/test';
/* What runs while the page sits still? Load, wait, then profile 4 s of idle
   (no scroll, no pointer). env: PAGE W H CPU */
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4);
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
await p.waitForTimeout(7000);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
await cdp.send('Profiler.start');
await p.waitForTimeout(4000);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map(); const total = new Map();
const dt = profile.timeDeltas; let t = 0; let idle = 0;
const keyOf = (n) => { const cf = n.callFrame; const url = (cf.url || '').replace('http://localhost:3300', '').split('?')[0]; return `${cf.functionName || '(anon)'} @ ${url.split('/').pop() || '(native)'}:${cf.lineNumber}:${cf.columnNumber}`; };
for (let i = 0; i < profile.samples.length; i++) {
  const d = dt[i] || 0; t += d;
  let id = profile.samples[i]; const n = byId.get(id);
  const k = keyOf(n); if (k.startsWith('(idle)')) idle += d;
  self.set(k, (self.get(k) || 0) + d);
  const seen = new Set();
  while (id !== undefined) { const m = byId.get(id); const kk = keyOf(m); if (!seen.has(kk)) { seen.add(kk); total.set(kk, (total.get(kk) || 0) + d); } id = parent.get(id); }
}
console.log('page', page, 'W', W, 'profiled ms', Math.round(t / 1000), 'idle', Math.round(idle / 1000), `(${(100 * idle / t).toFixed(0)}% idle)`);
console.log('--- top SELF');
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / t).toFixed(1).padStart(5)}%  ${k}`);
console.log('--- top TOTAL, app code');
for (const [k, v] of [...total.entries()].filter(([k]) => !k.includes('(native)') && !k.startsWith('(root)') && !k.startsWith('(program)') && !k.startsWith('(idle)')).sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / t).toFixed(1).padStart(5)}%  ${k}`);
await b.close();
