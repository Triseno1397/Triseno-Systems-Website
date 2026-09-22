import { chromium } from '@playwright/test';
/* What clicking the Operator costs: frame times while he is idle, then across
   the whole move. node design-loop/robot-strike.mjs [base] */
const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(150000);
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
await p.goto(base + '/', { waitUntil: 'load' });
await p.waitForTimeout(12000);

const sample = async (label, ms, during) => {
  await p.evaluate(() => { window.__f = []; let last = performance.now(); const loop = (t) => { window.__f.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const t0 = Date.now();
  if (during) await during();
  await p.waitForTimeout(ms);
  const secs = (Date.now() - t0) / 1000;
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const f = (await p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__f.slice(2); })).filter((x) => x > 0);
  const so = [...f].sort((a, c) => a - c);
  const d = (k) => Math.round(((m1[k] - m0[k]) / secs) * 1000);
  console.log(
    label.padEnd(22),
    'fps', String(Math.round(1000 / (f.reduce((a, c) => a + c, 0) / f.length))).padStart(4),
    '| p95', String(Math.round(so[Math.floor(so.length * 0.95)])).padStart(3) + 'ms',
    '| worst', String(Math.round(so[so.length - 1])).padStart(4) + 'ms',
    '| over 33ms', String(f.filter((x) => x > 33).length).padStart(3),
    '| script', String(d('ScriptDuration')).padStart(4),
    '| gpu-ish(program) n/a',
  );
};

await sample('idle (no click)', 3000);
const stage = await p.evaluate(() => {
  const el = document.querySelector('[data-world-layer]') || document.body;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width * 0.83), y: Math.round(r.y + r.height * 0.62) };
});
await sample('clicking the robot', 5200, async () => {
  await p.mouse.click(stage.x, stage.y);
});
await sample('after the move', 3000);
await sample('SECOND click', 5200, async () => { await p.mouse.click(stage.x, stage.y); });
await sample('idle again', 2500);
await sample('THIRD click', 5200, async () => { await p.mouse.click(stage.x, stage.y); });
await b.close();
