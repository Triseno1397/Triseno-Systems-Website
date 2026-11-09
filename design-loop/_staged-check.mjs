// Staged sections arrive whole: on a direct load and after a warp, every
// section is in the document, the warp's hold and the leaving lock are
// released, and no page errors. Also walks a menu-driven warp (no tour).
// env: BASE/PORT, W, H
import { chromium } from '@playwright/test';
const W = +(process.env.W || 1536), H = +(process.env.H || 864); const phone = W < 768;
const base = process.env.BASE || 'http://localhost:' + (process.env.PORT || 3300);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const state = () => p.evaluate(() => ({
  path: location.pathname,
  rails: [...document.querySelectorAll('main [data-rail]')].map((e) => e.getAttribute('data-rail')),
  comps: document.querySelectorAll('.web-range__comp').length,
  compare: document.querySelectorAll('.web-compare__layer').length,
  loading: document.documentElement.hasAttribute('data-world-loading'),
  leaving: !!document.querySelector('main[data-leaving]'),
  warping: document.documentElement.hasAttribute('data-warping'),
  mainH: Math.round(document.querySelector('main')?.getBoundingClientRect().height || 0),
  at: document.querySelector('.web-scene')?.dataset.at,
}));
const show = (label, s) => console.log(label.padEnd(34), `${s.path} rails=${s.rails.length} [${s.rails.join('|')}] comps=${s.comps} compare=${s.compare} mainH=${s.mainH} loading=${s.loading} leaving=${s.leaving} warping=${s.warping}`);
for (const path of ['/web-design-division', '/studio']) {
  await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  show('direct ' + path, await state());
}
// warp by the menu: home -> web -> studio -> home
await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
for (const [to, label] of [['/web-design-division', 'Web'], ['/studio', 'Creative'], ['/', 'Portal']]) {
  await p.locator('.morph-nav__trigger').click(); await p.waitForTimeout(600);
  await p.locator(`#world-menu a[href="${to}"]`).click();
  // mid-warp snapshots: the leaving lock and the hold, then the warp's end
  const t0 = Date.now(); let sawLock = false, sawHold = false, began = false;
  while (Date.now() - t0 < 12000) { const s = await state(); began ||= s.warping; sawLock ||= s.leaving; sawHold ||= s.loading; if (began && !s.warping && s.path === to) break; await p.waitForTimeout(25); }
  await p.waitForTimeout(1500);
  const s = await state(); show(`warp -> ${label} (lock seen ${sawLock}, hold seen ${sawHold})`, s);
  // scroll down and back so every section's triggers are exercised
  await p.mouse.wheel(0, 4000); await p.waitForTimeout(800); await p.mouse.wheel(0, -4000); await p.waitForTimeout(800);
}
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
