import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const base = process.env.BASE || 'http://localhost:3200';
const out = 'design-loop/shots/ours/p1/'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const shot = n => p.screenshot({ path: out + n + '.png' });
await p.goto(base + '/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800); await shot('01-loader');
await p.waitForTimeout(9000); await shot('02-hero');
await p.waitForTimeout(2500); await shot('03-hero-rotate');
const words = [['04','CREATIVE'],['05','WEB DESIGN'],['06','AI INFRASTRUCTURE'],['07','WORK']];
for (const [i, w] of words) { await p.getByText(w, { exact: true }).first().hover({ timeout: 4000 }).catch(e => errs.push('hover ' + w)); await p.waitForTimeout(1600); await shot(i + '-menu-hover'); }
await p.mouse.move(720, 450);
for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(1500); await shot(`08-scroll-${i}`); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);
await p.getByText('AI INFRASTRUCTURE', { exact: true }).first().click({ timeout: 4000 }).catch(e => errs.push('click AI'));
for (let i = 0; i < 4; i++) { await p.waitForTimeout(550); await shot(`09-warp-${i}`); }
await p.waitForTimeout(3500); await shot('10-landed-ai'); 
await p.mouse.wheel(0, 400); await p.waitForTimeout(1200); await shot('11-navbar-morphed');
const m = await b.newPage({ ...devices['iPhone 13'] });
await m.goto(base + '/', { waitUntil: 'domcontentloaded' }); await m.waitForTimeout(9000); await m.screenshot({ path: out + 'mobile-01.png' });
for (let i = 0; i < 3; i++) { await m.evaluate(() => window.scrollBy(0, 800)); await m.waitForTimeout(1500); await m.screenshot({ path: out + `mobile-0${i + 2}.png` }); }
fs.writeFileSync(out + 'console-errors.txt', errs.join('\n') || 'none');
await b.close(); console.log('ok', errs.length, 'errors');
