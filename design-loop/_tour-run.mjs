import { chromium } from '@playwright/test';
/* Runs the guided tour end to end on the tour concept (port 3401), logging
   each stop the caption card shows and shooting a few. env W H TAG */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const phone = W < 768;
const tag = process.env.TAG || 'tour';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:3401/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.screenshot({ path: `design-loop/shots/${tag}-0-launch.png` });
await p.locator('.tour-launch').click();
const t0 = Date.now();
let last = '';
let shots = 0;
const want = new Set(['Stop 02', 'Stop 05', 'Stop 09', 'Stop 11', 'Stop 13', 'Stop 16']);
while (Date.now() - t0 < 300000) {
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => {
    const c = document.querySelector('.tour-card');
    if (!c) return null;
    const meta = c.querySelector('.tour-card__meta')?.textContent ?? '';
    const title = c.querySelector('.tour-card__title')?.textContent ?? '';
    return { meta, title, phase: c.getAttribute('data-phase'), path: location.pathname, y: Math.round(scrollY) };
  });
  if (!s) continue;
  const key = s.meta + s.title + s.phase;
  if (key !== last) {
    last = key;
    console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s.path} y=${s.y} [${s.phase}] ${s.meta} :: ${s.title}`);
    const stop = (s.meta.match(/Stop \d+/) || [''])[0];
    if (s.phase === 'holding' && want.has(stop)) {
      want.delete(stop);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `design-loop/shots/${tag}-${stop.replace(' ', '')}.png` });
      shots++;
    }
  }
  if (s.title.startsWith('That was')) {
    await p.waitForTimeout(800);
    await p.screenshot({ path: `design-loop/shots/${tag}-end.png` });
    break;
  }
}
console.log('total', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'shots', shots, errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
await b.close();
