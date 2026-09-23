import { chromium } from '@playwright/test';
/* Which DOM layers the compositor has to work for on a page: every element
   composited with a cost that scales with the viewport — a backdrop filter,
   a blend mode, a filter, a large fixed/transformed layer — with its size.
   node design-loop/dom-probe.mjs [path] */
const base = process.env.BASE || 'http://localhost:3300';
const path = process.argv[2] || '/';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(base + path, { waitUntil: 'load' });
await p.waitForTimeout(12000);
const rows = await p.evaluate(() => {
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    const area = (Math.min(r.right, vw) - Math.max(r.left, 0)) * (Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (area <= 0) continue;
    const why = [];
    if (cs.backdropFilter !== 'none') why.push('backdrop-filter ' + cs.backdropFilter);
    if (cs.mixBlendMode !== 'normal') why.push('mix-blend ' + cs.mixBlendMode);
    if (cs.filter !== 'none') why.push('filter ' + cs.filter);
    if (cs.maskImage !== 'none') why.push('mask');
    const big = area > vw * vh * 0.25;
    if (big && (cs.willChange !== 'auto' || cs.transform !== 'none' || cs.position === 'fixed' || cs.opacity !== '1' || cs.animationName !== 'none')) why.push('big layer (' + [cs.willChange !== 'auto' && 'will-change:' + cs.willChange, cs.transform !== 'none' && 'transform', cs.position === 'fixed' && 'fixed', cs.opacity !== '1' && 'opacity ' + cs.opacity, cs.animationName !== 'none' && 'animation'].filter(Boolean).join(', ') + ')');
    if (!why.length) continue;
    const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    out.push({ tag, pct: Math.round((area / (vw * vh)) * 100), why: why.join('; ') });
  }
  return out.sort((a, c) => c.pct - a.pct);
});
await b.close();
console.log('\n' + path + ': composited layers with a viewport-sized cost (% of viewport covered):');
for (const r of rows) console.log('  ', String(r.pct).padStart(4) + '%', r.tag.padEnd(48), r.why);
