import { chromium } from '@playwright/test';
/* Filmstrip of the loader: the TS mark should turn inside the ring. */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.route('**/*.glb', r => new Promise(res => setTimeout(() => res(r.continue().catch(() => {})), 15000)));
await p.goto(BASE + '/', { waitUntil: 'commit' }); await p.waitForSelector('.world-loader__mark');
await p.waitForTimeout(400);
for (let i = 0; i < 8; i++) {
  await p.screenshot({ path: `design-loop/shots/loader-${i}.png`, clip: { x: 85, y: 262, width: 220, height: 220 } });
  await p.waitForTimeout(420);
}
await b.close();
