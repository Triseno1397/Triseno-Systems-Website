import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(8000);
await p.screenshot({ path: 'design-loop/shots/sh-rest.png' });
for (const [i, name] of [[0, 'creative'], [1, 'web'], [2, 'ai']]) {
  const l = p.locator('a.portal-word').nth(i); const bb = await l.boundingBox();
  await p.mouse.move(bb.x + 30, bb.y + bb.height / 2); await p.waitForTimeout(2600);
  await p.screenshot({ path: `design-loop/shots/sh-${name}.png` });
}
console.log('errors', errs.length ? errs[0] : 'none');
await b.close();
