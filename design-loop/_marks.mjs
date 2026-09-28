import { chromium } from '@playwright/test';
/* Captures every TS-mark placement. node design-loop/_marks.mjs */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const errs = [];
const shot = async (name, w, h, fn) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
  p.on('pageerror', e => errs.push(name + ': ' + String(e).slice(0, 160)));
  await fn(p);
  await p.screenshot({ path: `design-loop/shots/mark-${name}.png` });
  await p.close();
};
// loader mid-fill: capture early
await shot('loader', 1440, 900, async p => { await p.goto(BASE + '/?world=lite', { waitUntil: 'commit' }); await p.waitForSelector('.world-loader__mark'); await p.waitForTimeout(900); });
await shot('nav', 1440, 900, async p => { await p.goto(BASE + '/studio', { waitUntil: 'load' }); await p.waitForTimeout(5000); });
await shot('nav-compact', 1440, 900, async p => { await p.goto(BASE + '/work', { waitUntil: 'load' }); await p.waitForTimeout(4000); await p.mouse.wheel(0, 900); await p.waitForTimeout(2500); });
await shot('menu', 1440, 900, async p => { await p.goto(BASE + '/work', { waitUntil: 'load' }); await p.waitForTimeout(4000); await p.click('.morph-nav__trigger'); await p.waitForTimeout(700); await p.hover('#world-menu a[href="/"]'); await p.waitForTimeout(1400); });
for (const [n, r] of [['signoff-ai', '/ai-infrastructure'], ['signoff-work', '/work']]) {
  await shot(n, 1440, 900, async p => { await p.goto(BASE + r, { waitUntil: 'load' }); await p.waitForTimeout(4000); for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 1200); await p.waitForTimeout(60); } await p.waitForTimeout(3000); });
}
await shot('signoff-phone', 390, 844, async p => { await p.goto(BASE + '/work', { waitUntil: 'load' }); await p.waitForTimeout(4000); await p.evaluate(() => window.scrollTo(0, 1e6)); await p.waitForTimeout(3000); });
await shot('nav-phone', 390, 844, async p => { await p.goto(BASE + '/web-design-division', { waitUntil: 'load' }); await p.waitForTimeout(5000); });
await shot('404', 1440, 900, async p => { await p.goto(BASE + '/nope', { waitUntil: 'load' }); await p.waitForTimeout(3000); });
await shot('warp', 1440, 900, async p => { await p.goto(BASE + '/work', { waitUntil: 'load' }); await p.waitForTimeout(4000); await p.click('.morph-nav__trigger'); await p.waitForTimeout(700); await p.click('#world-menu a[href="/studio"]'); await p.waitForTimeout(1300); });
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
