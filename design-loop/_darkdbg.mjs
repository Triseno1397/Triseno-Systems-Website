import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(3000);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (const f of [0.86, 0.9, 0.94, 0.97, 1]) {
  await p.evaluate(y => window.scrollTo(0, y), total * f); await p.waitForTimeout(1200);
  console.log(f, await p.evaluate(() => {
    const h = document.documentElement; const d = document.querySelector('.ai-descent') || document.querySelector('[class*="descent"]');
    const r = d ? d.getBoundingClientRect() : null;
    return { dark: h.hasAttribute('data-clean-dark'), y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, desc: r ? [Math.round(r.top), Math.round(r.bottom)] : null };
  }));
}
await b.close();
