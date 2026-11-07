import { chromium } from '@playwright/test';
/* Frame cost per section: scroll the page like a person and bucket every
   frame by the [data-rail] section under the top of the screen.
   env PORT PAGE W H CPU */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4); const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await p.addInitScript(() => {
  window.__f = [];
  let last = performance.now();
  const tick = (t) => { window.__f.push([t - last, scrollY]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.goto('http://localhost:' + (process.env.PORT || 3300) + page + '?explore=off', { waitUntil: 'load' });
await p.waitForTimeout(4000);
const rails = await p.evaluate(() => [...document.querySelectorAll('main [data-rail]')].map((e) => { const h = e.parentElement?.classList.contains('pin-spacer') ? e.parentElement : e; return [e.dataset.rail, Math.round(h.getBoundingClientRect().top + scrollY)]; }));
await p.evaluate(() => { window.__f.length = 0; });
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let i = 0; i < Math.ceil(total / 110); i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(16); }
await p.waitForTimeout(800);
const frames = await p.evaluate(() => window.__f.slice(3));
const name = (y) => { let n = rails[0][0]; for (const [r, top] of rails) if (y >= top - 1) n = r; return n; };
const by = new Map();
for (const [d, y] of frames) { const k = name(y); if (!by.has(k)) by.set(k, []); by.get(k).push(d); }
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(1); };
console.log(`${page} ${W}x${H} cpu${cpu}`);
for (const [r, top] of rails) { const a = by.get(r) || []; if (!a.length) continue; console.log(`  ${r.padEnd(16)} y=${String(top).padStart(5)} n=${String(a.length).padStart(4)} p50=${String(q(a, .5)).padStart(5)} p95=${String(q(a, .95)).padStart(6)} max=${Math.max(...a).toFixed(0).padStart(4)} >33=${a.filter((x) => x > 33).length}`); }
await b.close();
