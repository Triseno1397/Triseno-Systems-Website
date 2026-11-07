import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* QA screenshots for the tour dock, the hands-free card, the atmosphere
   trim (new build on PORT vs old build on OLD) and the phone home page. */
const PORT = process.env.PORT || 3403, OLD = process.env.OLD || 3404;
fs.mkdirSync('design-loop/shots', { recursive: true });
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const shot = async (p, name) => p.screenshot({ path: `design-loop/shots/qa-${name}.png` });
const open = async (phone) => {
  const ctx = await b.newContext(phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  return [ctx, p];
};
const scrollTo = (p, y) => p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);

// desktop: hero with launcher, dock after scrolling, intro card, web + studio tops new vs old
{
  const [ctx, p] = await open(false);
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
  await shot(p, 'd-home-hero');
  await scrollTo(p, 1800); await p.waitForTimeout(1500); await shot(p, 'd-home-dock');
  await scrollTo(p, 0); await p.waitForTimeout(1200);
  await p.locator('.tour-launch--hero').click(); await p.waitForTimeout(1300); await shot(p, 'd-intro');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  for (const [port, tag] of [[PORT, 'new'], [OLD, 'old']]) {
    await p.goto(`http://localhost:${port}/web-design-division?explore=off`, { waitUntil: 'load' }); await p.waitForTimeout(4000);
    await shot(p, `d-web-top-${tag}`);
    await scrollTo(p, 4700); await p.waitForTimeout(1800); await shot(p, `d-web-prism-${tag}`);
    await p.goto(`http://localhost:${port}/studio?explore=off`, { waitUntil: 'load' }); await p.waitForTimeout(4000);
    await scrollTo(p, 3000); await p.waitForTimeout(1800); await shot(p, `d-studio-cases-${tag}`);
  }
  await ctx.close();
}
// phone: home hero, home at fine steps (the blank frames), dock mid-page, intro card
{
  const [ctx, p] = await open(true);
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' }); await p.waitForTimeout(4500);
  await shot(p, 'p-home-hero');
  const rails = await p.evaluate(() => [...document.querySelectorAll('main [data-rail]')].map((e) => `${e.dataset.rail}@${Math.round(e.getBoundingClientRect().top + scrollY)}+${e.offsetHeight}`).join(' '));
  console.log('phone home rails:', rails);
  for (const y of [300, 600, 900, 1200, 1500, 1800]) { await scrollTo(p, y); await p.waitForTimeout(900); await shot(p, `p-home-y${y}`); }
  console.log('hero inner style at y=900:', await p.evaluate(() => { const h = document.querySelector('.portal-hero'); const cs = getComputedStyle(h); return `${cs.opacity} ${cs.visibility} ${cs.transform} h=${h.offsetHeight}`; }));
  await scrollTo(p, 0); await p.waitForTimeout(1000);
  await p.locator('.tour-launch--hero').click(); await p.waitForTimeout(1300); await shot(p, 'p-intro');
  await ctx.close();
}
await b.close();
console.log('shots done');
