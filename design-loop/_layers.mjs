import { chromium } from '@playwright/test';
/* which elements are expensive to composite: backdrop-filter, filter, blend
   modes, will-change, big fixed layers. env PORT PAGE W H Y */
const W = +(process.env.W || 1440), H = +(process.env.H || 900); const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
await p.goto('http://localhost:' + (process.env.PORT || 3403) + (process.env.PAGE || '/web-design-division') + '?explore=off', { waitUntil: 'load' }); await p.waitForTimeout(3500);
if (process.env.Y) { await p.evaluate((y) => scrollTo({ top: +y, behavior: 'instant' }), process.env.Y); await p.waitForTimeout(1500); }
console.log(await p.evaluate(() => {
  const out = []; const vw = innerWidth, vh = innerHeight;
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const onscreen = r.bottom > -vh && r.top < vh * 2 && r.width > 0;
    if (!onscreen) continue;
    const flags = [];
    if (cs.backdropFilter !== 'none') flags.push('backdrop:' + cs.backdropFilter.slice(0, 20));
    if (cs.filter !== 'none') flags.push('filter:' + cs.filter.slice(0, 24));
    if (cs.mixBlendMode !== 'normal') flags.push('blend:' + cs.mixBlendMode);
    if (cs.willChange !== 'auto') flags.push('wc:' + cs.willChange);
    if (el.tagName === 'CANVAS' || el.tagName === 'VIDEO') flags.push(el.tagName + ' ' + (el.width || '') + 'x' + (el.height || ''));
    if (cs.maskImage !== 'none') flags.push('mask');
    if (!flags.length) continue;
    const area = Math.round(r.width * r.height / (vw * vh) * 100);
    out.push(`${area.toString().padStart(4)}%vp  ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}  ${flags.join(' ')}  y=${Math.round(r.top)}`);
  }
  return out.sort((a, b) => parseInt(b) - parseInt(a)).join('\n');
}));
await b.close();
