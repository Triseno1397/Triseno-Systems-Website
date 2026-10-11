import { chromium } from '@playwright/test';
/* Screenshot a pinned film section at several progress points.
   env: PAGE=/ai-infrastructure SEL=.ai-fs TAG=ferro-d W H */
const W = +(process.env.W || 1440), H = +(process.env.H || 900), tag = process.env.TAG || 'film';
const page = process.env.PAGE || '/ai-infrastructure', sel = process.env.SEL || '.ai-fs';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' }); await p.waitForTimeout(4000);
// walk down to the section so lazy things above have settled, then measure it
const box = await p.evaluate(s => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); return { top: r.top + scrollY, height: r.height }; }, sel);
const dist = Math.max(0, box.height - H);
console.log('section top', Math.round(box.top), 'height', Math.round(box.height), 'pin distance', Math.round(dist));
const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
let i = 0;
for (const f of steps) {
  const y = box.top + dist * f;
  // approach in small hops so scrub/smoothing and lazy loads have time
  await p.evaluate(yy => window.scrollTo(0, yy - 300), y); await p.waitForTimeout(250);
  await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(1800);
  await p.screenshot({ path: `design-loop/shots/${tag}-${String(i++).padStart(2, '0')}.png` });
}
console.log('shots', i, 'errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
