import { chromium, devices } from '@playwright/test';
import fs from 'fs';
// Per-section scroll smoothness. DESKTOP: real GPU, wheel scrolling (Lenis).
// PHONE: iPhone viewport, 4x CPU throttle, native scroll driven per frame.
const base = process.env.BASE || 'http://localhost:3300';
const routes = (process.env.ROUTES || '/,/studio,/web-design-division,/ai-infrastructure,/work,/contact').split(',');
const mode = process.env.MODE || 'desktop';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
const out = {};
for (const r of routes) {
  const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  if (mode === 'phone') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(mode === 'phone' ? 9000 : 6000);
  // sections: direct content children of <main> with a rail label, else every section
  const secs = await p.evaluate(() => {
    const list = [...document.querySelectorAll('main section, main [data-rail]')].filter(el => el.getBoundingClientRect().height > 200);
    const seen = new Set(); const res = [];
    for (const el of list) { const top = Math.round(el.getBoundingClientRect().top + scrollY); const h = Math.round(el.getBoundingClientRect().height);
      const name = (el.getAttribute('data-rail') || el.getAttribute('aria-label') || el.className.split(' ')[0] || el.tagName).slice(0, 28);
      if ([...seen].some(t => Math.abs(t - top) < 150)) continue; seen.add(top); res.push({ name, top, h }); }
    return res.sort((a, b) => a.top - b.top);
  });
  out[r] = [];
  for (const s of secs) {
    await p.evaluate(y => window.scrollTo(0, y), Math.max(0, s.top - 50)); await p.waitForTimeout(1200);
    await p.evaluate(() => { window.__f = []; window.__lt = 0; let last = performance.now(); const loop = t => { window.__f.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt += e.duration)).observe({ type: 'longtask' }); } catch {} });
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const t0 = Date.now(); const dist = Math.max(900, s.h);
    if (mode === 'phone') {
      // native-like fling: scroll by ~22px per frame
      await p.evaluate(d => new Promise(res => { let done = 0; const step = () => { window.scrollBy(0, 22); done += 22; if (done < d) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }), dist);
    } else {
      await p.mouse.move(720, 450);
      for (let d = 0; d < dist; d += 100) { await p.mouse.wheel(0, 100); if ((d / 100) % 3 === 0) await p.mouse.move(300 + (d * 7) % 900, 250 + (d * 3) % 400); await p.waitForTimeout(40); }
    }
    await p.waitForTimeout(700);
    const secsT = (Date.now() - t0) / 1000;
    const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const f = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return { f: window.__f.slice(3), lt: window.__lt }; });
    const fr = f.f.filter(x => x > 0); const so = [...fr].sort((a, b) => a - b);
    const d = k => Math.round((m1[k] - m0[k]) / secsT * 1000);
    out[r].push({ section: s.name, fps: +(1000 / (fr.reduce((a, b) => a + b, 0) / fr.length)).toFixed(0), p95: +so[Math.floor(so.length * 0.95)].toFixed(0), jank: +(100 * fr.filter(x => x > 33).length / fr.length).toFixed(1), longtask: Math.round(f.lt), script: d('ScriptDuration'), style: d('RecalcStyleDuration'), layout: d('LayoutDuration') });
  }
  await ctx.close();
  console.log('\n' + mode.toUpperCase() + ' ' + r); console.table(out[r]);
}
fs.writeFileSync(`design-loop/section-perf-${mode}-${process.env.TAG || 'run'}.json`, JSON.stringify(out, null, 1));
await b.close();
