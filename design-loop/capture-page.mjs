import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const [route, name] = process.argv.slice(2);
const base = process.env.BASE || 'http://localhost:3200';
const out = `design-loop/shots/ours/${name}/`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(base + route, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200); await p.screenshot({ path: out + '00-first-paint.png' });
await p.waitForTimeout(6000); await p.screenshot({ path: out + '01-hero.png' });
await p.mouse.move(700, 450);
let i = 2, last = -1;
for (let n = 0; n < 40; n++) {
  await p.mouse.wheel(0, 600); await p.waitForTimeout(1300);
  const y = await p.evaluate(() => Math.round(window.scrollY));
  await p.screenshot({ path: out + String(i++).padStart(2, '0') + `-scroll-y${y}.png` });
  if (y === last) break; last = y;
}
const m = await b.newPage({ ...devices['iPhone 13'] });
await m.goto(base + route, { waitUntil: 'domcontentloaded' }); await m.waitForTimeout(6000);
const h = await m.evaluate(() => document.documentElement.scrollHeight);
const ow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
for (let k = 0; k < 10; k++) { await m.evaluate(([k, h]) => window.scrollTo(0, Math.round((h - 800) * k / 9)), [k, h]); await m.waitForTimeout(1200); await m.screenshot({ path: out + `mobile-${String(k).padStart(2, '0')}.png` }); }
fs.writeFileSync(out + 'notes.txt', `console errors: ${errs.join(' | ') || 'none'}\nmobile horizontal overflow px: ${ow}\npage height mobile: ${h}`);
await b.close(); console.log('ok', name, errs.length, 'errors, overflow', ow);
