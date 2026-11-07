import { chromium } from '@playwright/test';
const W = +(process.env.W || 1536), H = +(process.env.H || 864); const phone = W < 768; const tag = process.env.TAG || 'tour2';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 3401) + '/', { waitUntil: 'load' }); await p.waitForTimeout(2000);
await p.locator('.tour-launch--hero').click();
const t0 = Date.now(); let last = ''; let n = 0;
while (Date.now() - t0 < 160000) {
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => { const c = document.querySelector('.tour-card'); return c ? { ph: c.dataset.phase, m: c.querySelector('.tour-card__meta')?.textContent, t: c.querySelector('.tour-card__title')?.textContent, y: Math.round(scrollY), path: location.pathname, inside: !!document.querySelector('.sxc__back[aria-hidden="false"]') } : null; });
  if (!s) continue;
  const key = `${s.ph}|${s.m}|${s.t}`;
  if (key !== last) { last = key; console.log(((Date.now() - t0) / 1000).toFixed(1), s.path, 'y=' + s.y, s.ph, s.m, '::', s.t); }
  const sec = Math.floor((Date.now() - t0) / 1000);
  if (s.ph === 'playing' && sec % 4 === 0 && n < 30) { await p.screenshot({ path: `design-loop/shots/${tag}-${String(n++).padStart(2, '0')}.png` }); }
  if (s.t?.startsWith('That was')) { await p.screenshot({ path: `design-loop/shots/${tag}-end.png` }); break; }
}
console.log('total', ((Date.now() - t0) / 1000).toFixed(0) + 's', errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
await b.close();
