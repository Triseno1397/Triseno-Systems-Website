import { chromium } from '@playwright/test';
const BASE = process.env.BASE || 'http://localhost:3302';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + '/', { waitUntil: 'load' });
await p.waitForTimeout(7000);
await p.locator('.portal-word[data-door]').first().click();
for (const t of [900, 1700, 2600]) { await p.waitForTimeout(t === 900 ? 900 : 800); await p.screenshot({ path: `design-loop/shots/warpweb-${t}.png` }); }
await p.waitForTimeout(5000);
console.log(p.url());
await b.close();
