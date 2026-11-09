// What one forced layout of a page costs, and how that splits across the
// sections under <main>: hide every section, then reveal them one at a time
// and time the forced layout each reveal causes. env: BASE/PORT, PAGE, W, H, CPU
import { chromium } from '@playwright/test';
const W = +(process.env.W || 390), H = +(process.env.H || 844); const phone = W < 768; const CPU = +(process.env.CPU || 1);
const base = process.env.BASE || 'http://localhost:' + (process.env.PORT || 3300);
const PAGE = process.env.PAGE || '/web-design-division';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await p.goto(base + PAGE, { waitUntil: 'load' });
await p.waitForTimeout(5000);
const r = await p.evaluate(() => {
  const main = document.querySelector('main');
  const kids = Array.from(main.children);
  const force = () => { const t = performance.now(); void document.body.offsetHeight; return performance.now() - t; };
  const dirty = () => { main.style.paddingTop = main.style.paddingTop === '0.01px' ? '0px' : '0.01px'; };
  const out = { total: [], style: [], sections: [] };
  for (let i = 0; i < 3; i++) { dirty(); out.total.push(+force().toFixed(1)); }
  // a style-only recalc: toggle an attribute on html with no layout effect
  for (let i = 0; i < 3; i++) { document.documentElement.toggleAttribute('data-x-probe'); const t = performance.now(); void getComputedStyle(document.body).color; out.style.push(+(performance.now() - t).toFixed(1)); }
  // per-section: hide all, then reveal one by one
  const prev = kids.map((k) => k.style.display);
  kids.forEach((k) => (k.style.display = 'none'));
  force();
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    k.style.display = prev[i];
    const ms = force();
    const name = k.getAttribute('data-rail') || k.className.split(' ')[0] || k.tagName;
    out.sections.push({ name, nodes: k.querySelectorAll('*').length, ms: +ms.toFixed(1), height: Math.round(k.getBoundingClientRect().height) });
  }
  dirty(); out.after = +force().toFixed(1);
  out.nodes = document.querySelectorAll('*').length;
  return out;
});
console.log(`${PAGE} ${W}x${H} cpu x${CPU}  ${r.nodes} nodes  full layout ${r.total.join('/')} ms  style-only ${r.style.join('/')} ms  after ${r.after} ms`);
for (const s of r.sections) console.log(`  ${s.ms.toFixed(1).padStart(6)} ms  ${String(s.nodes).padStart(5)} nodes  h=${String(s.height).padStart(5)}  ${s.name}`);
await b.close();
