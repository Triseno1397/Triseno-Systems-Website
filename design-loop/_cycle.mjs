// The gate's changing word: capture the headline every 0.3 s on desktop and phone, log the word each frame.
import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: name === 'phone' ? 2 : 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
  await p.goto('http://localhost:3300/web-design-division', { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const top = await p.evaluate(() => { const e = document.querySelector('.web-gate__title'); return e.getBoundingClientRect().top + scrollY; });
  await p.evaluate((t) => window.scrollTo(0, t - innerHeight * 0.35), top); await p.waitForTimeout(2500);
  const words = [];
  for (let i = 0; i < 24; i++) {
    const el = await p.$('.web-gate__title');
    await el.screenshot({ path: `design-loop/shots/cycle-${name}-${String(i).padStart(2, '0')}.png` });
    words.push(await p.evaluate(() => { const w = document.querySelector('.web-gate__cycle'); return w.textContent + ':' + [...w.children].map((c) => (+getComputedStyle(c).opacity).toFixed(1)).join(''); }));
    await p.waitForTimeout(300);
  }
  console.log(name, words.join(' '));
  await p.close();
}
await b.close();
