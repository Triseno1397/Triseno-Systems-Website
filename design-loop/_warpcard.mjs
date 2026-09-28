import { chromium } from '@playwright/test';
/* One frame of the warp card mid-hop, per destination. */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const to of ['/studio', '/ai-infrastructure']) {
  await p.goto(BASE + '/work', { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.click('.morph-nav__trigger'); await p.waitForTimeout(700);
  await p.click(`#world-menu a[href="${to}"]`); await p.waitForTimeout(1500);
  await p.screenshot({ path: `design-loop/shots/warp${to.replace('/', '-')}.png` });
}
await b.close();
