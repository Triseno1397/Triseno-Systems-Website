import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.goto('http://localhost:3401/', { waitUntil: 'load' }); await p.waitForTimeout(2000);
console.log(await p.evaluate(() => [...document.querySelectorAll('[data-rail="Web Design"],[data-rail="Gate"]')].map(e => `${e.dataset.rail} in-main=${!!e.closest('main')} top=${Math.round(e.getBoundingClientRect().top + scrollY)} disp=${getComputedStyle(e).display} parent=${e.parentElement.className.slice(0,40)}`).join('\n')));
await p.locator('.tour-launch').click();
const t0 = Date.now();
while (Date.now() - t0 < 22000) { await p.waitForTimeout(1000); console.log(((Date.now()-t0)/1000).toFixed(0), await p.evaluate(() => Math.round(scrollY) + ' ' + document.querySelector('.tour-card')?.dataset.phase)); }
await b.close();
