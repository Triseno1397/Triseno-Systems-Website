import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto((process.env.BASE || 'http://localhost:3300') + '/', { waitUntil: 'load' }); await p.waitForTimeout(7000);
await p.screenshot({ path: process.argv[2] });
if (process.env.HOVER) { const l = p.locator('a.portal-word').first(); const bb = await l.boundingBox(); await p.mouse.move(bb.x + 20, bb.y + bb.height / 2); await p.waitForTimeout(1800); await p.screenshot({ path: process.argv[2].replace('.png', '-hover.png') }); }
await b.close();
