import { chromium } from '@playwright/test';
import fs from 'fs';
const bases = (process.env.BASES || process.env.BASE || 'https://trisenosystems.com').split(',');
const routes = (process.env.ROUTES || '/,/studio,/web-design-division,/ai-infrastructure,/work,/contact').split(',');
const tag = process.env.TAG || 'run';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
const res = {};
for (const r of routes) for (const base of bases) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(6000);
  await p.mouse.move(720, 450);
  await p.evaluate(() => { window.__f = []; window.__lt = 0; let last = performance.now();
    const loop = t => { window.__f.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt += e.duration)).observe({ type: 'longtask', buffered: false }); });
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const t0 = Date.now();
  // steady wheel scrolling like a person: 100px notches every 50ms, sweep the mouse over the page too
  for (let i = 0; i < 400; i++) { await p.mouse.wheel(0, 100); if (i % 4 === 0) await p.mouse.move(300 + (i * 37) % 900, 250 + (i * 53) % 450); await p.waitForTimeout(45);
    if (i % 20 === 0 && await p.evaluate(h => scrollY >= h - 5, H)) break; }
  await p.waitForTimeout(1500);
  const secs = (Date.now() - t0) / 1000;
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const f = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return { f: window.__f.slice(2), lt: window.__lt }; });
  const fr = f.f.filter(x => x > 0); const sorted = [...fr].sort((a, b) => a - b);
  const pct = q => sorted[Math.floor(sorted.length * q)];
  const d = k => ((m1[k] - m0[k]) / secs * 1000).toFixed(0);
  res[base + r] = { fps: (1000 / (fr.reduce((a, b) => a + b, 0) / fr.length)).toFixed(1), p50ms: pct(0.5)?.toFixed(1), p95ms: pct(0.95)?.toFixed(1), jank33: (100 * fr.filter(x => x > 33).length / fr.length).toFixed(1) + '%',
    script_ms_s: d('ScriptDuration'), style_ms_s: d('RecalcStyleDuration'), layout_ms_s: d('LayoutDuration'), layouts: m1.LayoutCount - m0.LayoutCount, styles: m1.RecalcStyleCount - m0.RecalcStyleCount, longtask_ms: f.lt.toFixed(0), heapMB: (m1.JSHeapUsedSize / 1e6).toFixed(0), nodes: m1.Nodes };
  console.log((base.includes('localhost') ? 'NEW ' : 'LIVE') + ' ' + r.padEnd(22), JSON.stringify(res[base + r]));
  await p.close();
}
fs.writeFileSync(`design-loop/perf-${tag}.json`, JSON.stringify(res, null, 1));
await b.close();
