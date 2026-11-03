import { chromium } from '@playwright/test';
const W = +(process.env.W || 1536), H = +(process.env.H || 864);
const WAIT = +(process.env.WAIT || 1500), HERO = process.env.HERO === '1';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:3401/', { waitUntil: 'load' });
await p.waitForTimeout(WAIT);
if (HERO) await p.locator('text=Take the guided tour').first().click(); else await p.locator('.tour-launch').click();
const t0 = Date.now(); let last = '';
while (Date.now() - t0 < 40000) {
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => { const c = document.querySelector('.tour-card'); return c ? `${c.dataset.phase} ${c.querySelector('.tour-card__meta')?.textContent} ${c.querySelector('.tour-card__title')?.textContent} y=${Math.round(scrollY)} lenis=${document.documentElement.className}` : 'none y=' + scrollY; });
  if (s !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1), s); last = s; }
}
await b.close();
