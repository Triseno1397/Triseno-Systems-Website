import { chromium } from '@playwright/test';
/* Frame times through the Operator's click: the forge, the draw, and both
   moves (spin, then jump). BASE= to point at another build; PHONE=1 for an
   iPhone viewport at 4x CPU throttle. Prints worst frame, p95, frames over
   50ms and long-task time for each click. */
const base = process.env.BASE || 'http://localhost:3300';
const phone = process.env.PHONE === '1';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] });
const { devices } = await import('@playwright/test');
const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(120000);
// a frame "rendered" when any WebGL draw call ran in it; the world may be
// drawn at 30 or skip frames while rAF itself runs free
await p.addInitScript(() => {
  window.__draws = 0;
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const o = C.prototype[k]; if (!o) continue;
      C.prototype[k] = function (...a) { window.__draws++; return o.apply(this, a); };
    }
  }
});
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 150)));
if (phone) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(phone ? 12000 : 9000);
const vp = p.viewportSize();
const at = phone ? [vp.width * 0.62, vp.height * 0.55] : [1215, 480];
for (const move of ['spin', 'jump']) {
  await p.evaluate(() => { window.__f = []; window.__r = []; window.__lt = 0; let last = performance.now(); let lastR = last; let d0 = window.__draws; const loop = t => { window.__f.push(t - last); last = t; if (window.__draws !== d0) { window.__r.push(t - lastR); lastR = t; d0 = window.__draws; } window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt += e.duration)).observe({ type: 'longtask' }); } catch {} });
  if (phone) await p.touchscreen.tap(at[0], at[1]); else { await p.mouse.move(at[0], at[1]); await p.mouse.click(at[0], at[1]); }
  await p.waitForTimeout(7000);
  const f = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return { f: window.__f.slice(2), r: window.__r.slice(2), lt: window.__lt, q: document.documentElement.dataset.worldQuality }; });
  const so = [...f.f].sort((a, c) => a - c);
  console.log(move.padEnd(5), 'frames', f.f.length, 'avg fps', (1000 / (f.f.reduce((a, c) => a + c, 0) / f.f.length)).toFixed(0), 'p95', so[Math.floor(so.length * 0.95)].toFixed(1), 'worst', so[so.length - 1].toFixed(1), '>50ms', f.f.filter(x => x > 50).length, 'longtask', Math.round(f.lt));
  const rs = [...f.r].sort((a, c) => a - c);
  console.log('      rendered fps', (1000 * f.r.length / f.r.reduce((a, c) => a + c, 0)).toFixed(0), 'p95 gap', rs[Math.floor(rs.length * 0.95)].toFixed(1), 'worst gap', rs[rs.length - 1].toFixed(1), 'gaps>50ms', f.r.filter(x => x > 50).length, 'quality', f.q);
}
console.log('errors', errs.length ? errs.slice(0, 2) : 'none');
await b.close();
