import { chromium } from '@playwright/test';
/* Walk the AI page: screenshot each section (plus mid-interlude and a hover
   or two), collect page errors. BASE=, W=, H= */
const BASE = process.env.BASE || 'http://localhost:3300';
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const tag = process.env.TAG || 'd';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: W < 768 ? 2 : 1, isMobile: W < 768, hasTouch: W < 768 });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 240)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
await p.goto(BASE + '/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4500);
const shot = async (name) => p.screenshot({ path: `design-loop/shots/ai17-${tag}-${name}.png` });
const at = async (sel) => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); };
const total = await p.evaluate(() => document.documentElement.scrollHeight);
// step down the page in viewport-sized hops
let i = 0;
for (let y = 0; y < total; y += H * 0.9) {
  await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(1300);
  await shot(String(i++).padStart(2, '0'));
}
console.log('shots', i, 'errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
