// What adding a route's stylesheet to a live page costs: on FROM, insert each
// CSS chunk the destination route would bring and time the forced style pass
// that follows. env: BASE/PORT, FROM, SHEETS (comma list of /_next/... urls), W, H, CPU
import { chromium } from '@playwright/test';
const W = +(process.env.W || 390), H = +(process.env.H || 844); const phone = W < 768; const CPU = +(process.env.CPU || 1);
const base = process.env.BASE || 'http://localhost:' + (process.env.PORT || 3300);
const FROM = process.env.FROM || '/';
const sheets = (process.env.SHEETS || '').split(',').filter(Boolean);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.goto(base + FROM, { waitUntil: 'load' });
await p.waitForTimeout(5000);
for (const href of sheets) {
  const r = await p.evaluate(async (href) => {
    // fetch first so the insertion measures only the style work
    const css = await (await fetch(href)).text();
    const style = () => { const t = performance.now(); void getComputedStyle(document.body).color; return +(performance.now() - t).toFixed(1); };
    style();
    const el = document.createElement('style'); el.textContent = css;
    const t0 = performance.now(); document.head.appendChild(el); const recalc = style(); const total = +(performance.now() - t0).toFixed(1);
    const again = style();
    return { bytes: css.length, nodes: document.querySelectorAll('*').length, total, recalc, again };
  }, href);
  console.log(`${FROM} + ${href.split('/').pop()}  ${r.bytes} bytes  ${r.nodes} nodes  insert+recalc ${r.total} ms (recalc ${r.recalc}, next read ${r.again})`);
}
await b.close();
