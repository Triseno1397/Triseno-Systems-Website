import { chromium } from '@playwright/test';
/* Walk the revamped AI page in viewport hops, screenshot each, collect errors. W/H/TAG env. */
const W = +(process.env.W || 1440), H = +(process.env.H || 900), tag = process.env.TAG || 'd';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < total; y += H * 0.85) {
  await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(1400);
  await p.screenshot({ path: `design-loop/shots/rv-${tag}-${String(i++).padStart(2, '0')}.png` });
}
console.log('height', total, 'shots', i, 'errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
