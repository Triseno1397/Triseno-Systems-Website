// Records the Web Design "It's your ___" rewrite as real-time video at desktop and phone size,
// and logs the visible word every 0.5 s.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = 'design-loop/shots/wordplay'; fs.mkdirSync(OUT, { recursive: true });
const OPTS = [
  { id: 'B-rewrite', url: '/web-design-division', sel: '.web-rewrite__title', read: () => document.querySelector('.rw-word')?.textContent },
];
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
for (const [dev, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  for (const o of OPTS) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, isMobile: dev === 'phone', hasTouch: dev === 'phone', recordVideo: { dir: OUT + '/raw', size: dev === 'phone' ? { width: 780, height: 1688 } : { width: 1440, height: 900 } } });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3300' + o.url, { waitUntil: 'load' }); await p.waitForTimeout(5500);
    await p.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY - (innerHeight - r.height) / 2); }, o.sel);
    await p.waitForTimeout(800);
    const t0 = Date.now(); const log = [];
    while (Date.now() - t0 < 12000) { log.push(await p.evaluate(o.read)); await p.waitForTimeout(500); }
    const shot = OUT + `/${o.id}-${dev}.png`; await p.screenshot({ path: shot });
    const v = p.video(); await ctx.close(); fs.renameSync(await v.path(), OUT + `/${o.id}-${dev}.webm`);
    console.log(dev, o.id, [...new Set(log)].join(' > '));
  }
}
await b.close();
