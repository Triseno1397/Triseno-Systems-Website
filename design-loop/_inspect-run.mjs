import { chromium } from '@playwright/test';
/* Inspect mode on port 3402: turn it on, read the placard at a few sections of
   Web Design, add two to the list, send it, check the contact form. env W H TAG */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const phone = W < 768;
const tag = process.env.TAG || 'inspect';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:3402/web-design-division', { waitUntil: 'load' });
await p.evaluate(() => localStorage.removeItem('triseno:build'));
await p.waitForTimeout(4000);
await p.screenshot({ path: `design-loop/shots/${tag}-0-off.png` });
await p.locator('.inspect-toggle').click();
await p.waitForTimeout(1200);
await p.screenshot({ path: `design-loop/shots/${tag}-1-hero.png` });
const go = async (rail, at) => {
  const y = await p.evaluate(([rail, at]) => { const e = document.querySelector(`main [data-rail="${rail}"]`); const r = e.getBoundingClientRect(); return r.top + scrollY + Math.max(0, r.height - innerHeight) * at; }, [rail, at]);
  for (let s = await p.evaluate(() => scrollY); Math.abs(s - y) > 5; ) { s += Math.sign(y - s) * Math.min(300, Math.abs(y - s)); await p.evaluate((s) => window.scrollTo(0, s), s); await p.waitForTimeout(40); }
  await p.waitForTimeout(1500);
  return p.evaluate(() => document.querySelector('.inspect-card__title')?.textContent ?? '(none)');
};
console.log('Before/After ->', await go('Before / After', 0.15));
await p.locator('.inspect-card__add').click();
await p.waitForTimeout(400);
await p.screenshot({ path: `design-loop/shots/${tag}-2-compare.png` });
console.log('Deliverables ->', await go('Deliverables', 0));
await p.locator('.inspect-card__add').click();
await p.waitForTimeout(500);
await p.screenshot({ path: `design-loop/shots/${tag}-3-crystal.png` });
console.log('list:', await p.evaluate(() => document.querySelector('.inspect-card__list')?.textContent));
await p.locator('.inspect-card__send').click();
await p.waitForTimeout(6000);
console.log('url:', p.url());
const msg = await p.evaluate(() => document.querySelector('textarea')?.value ?? '(no textarea yet)');
console.log('message:', JSON.stringify(msg));
await p.screenshot({ path: `design-loop/shots/${tag}-4-contact.png` });
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
await b.close();
