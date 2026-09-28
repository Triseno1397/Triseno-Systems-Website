import { chromium } from '@playwright/test';
const BASE = 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
await p.route('**/*.glb', r => new Promise(res => setTimeout(() => res(r.continue().catch(() => {})), 4000)));
await p.goto(BASE + '/', { waitUntil: 'commit' }); await p.waitForSelector('.world-loader__mark'); await p.waitForTimeout(1500);
await p.screenshot({ path: 'design-loop/shots/mark-loader.png', clip: { x: 520, y: 250, width: 400, height: 400 } });

for (const r of ['/work', '/studio']) {
  await p.goto(BASE + r, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, 1200); await p.waitForTimeout(60); }
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `design-loop/shots/mark-signoff${r.replace('/', '-')}.png` });
}
await b.close();
