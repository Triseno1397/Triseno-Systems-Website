import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const base = process.env.BASE || 'http://localhost:3200';
const out = 'design-loop/shots/ours/p1/'; fs.mkdirSync(out, { recursive: true });
// Wait for smooth scroll (Lenis) to fully settle before a screenshot: on a slow
// software GPU the eased scroll is still in flight after a fixed wait, and a
// screenshot then catches a torn frame where fixed chrome looks displaced.
const settle = async (pg, max = 12000) => {
  const t0 = Date.now(); let last = null, stable = 0;
  while (Date.now() - t0 < max) {
    const s = await pg.evaluate(() => ({ y: Math.round(scrollY), moving: document.documentElement.classList.contains('lenis-scrolling') })).catch(() => null);
    if (s && !s.moving && last !== null && s.y === last) { if (++stable >= 3) return; } else stable = 0;
    last = s ? s.y : null; await pg.waitForTimeout(200);
  }
};
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const shot = n => p.screenshot({ path: out + n + '.png', timeout: 150000 });
await p.goto(base + '/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800); await shot('01-loader');
await p.waitForTimeout(9000); await shot('02-hero');
await p.waitForTimeout(2500); await shot('03-hero-rotate');
const words = [['04','CREATIVE'],['05','WEB DESIGN'],['06','AI INFRASTRUCTURE'],['07','WORK']];
for (const [i, w] of words) { await p.getByText(w, { exact: true }).filter({ visible: true }).first().hover({ timeout: 6000 }).catch(e => errs.push('hover ' + w)); await p.waitForTimeout(1600); await shot(i + '-menu-hover'); }
await p.mouse.move(720, 450);
for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(400); await settle(p); await shot(`08-scroll-${i}`); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);
await p.getByText('AI INFRASTRUCTURE', { exact: true }).filter({ visible: true }).first().click({ timeout: 4000 }).catch(e => errs.push('click AI'));
for (let i = 0; i < 4; i++) { await p.waitForTimeout(550); await shot(`09-warp-${i}`); }
await p.waitForTimeout(3500); await shot('10-landed-ai'); 
await p.mouse.wheel(0, 400); await p.waitForTimeout(400); await settle(p); await shot('11-navbar-morphed');
await p.close(); await b.close();
const b2 = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const m = await b2.newPage({ ...devices['iPhone 13'] });
await m.goto(base + '/', { waitUntil: 'domcontentloaded' }); await m.waitForTimeout(9000); await m.screenshot({ path: out + 'mobile-01.png', timeout: 150000 });
for (let i = 0; i < 3; i++) { await m.evaluate(() => window.scrollBy(0, 800)); await m.waitForTimeout(400); await settle(m); await m.screenshot({ path: out + `mobile-0${i + 2}.png`, timeout: 150000 }); }
fs.writeFileSync(out + 'console-errors.txt', errs.join('\n') || 'none');
await b2.close(); console.log('ok', errs.length, 'errors');
