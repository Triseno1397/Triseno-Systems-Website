import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 150))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 150)));
await p.goto((process.env.BASE || 'http://localhost:3300') + '/', { waitUntil: 'load' }); await p.waitForTimeout(8000);
// click on the robot's chest (right side of the hall)
for (const tag of ['A', 'B']) {
  await p.mouse.move(1215, 480); await p.waitForTimeout(600); await p.mouse.click(1215, 480);
  for (const [t, f] of [[1300, `c${tag}-forge`], [1500, `c${tag}-draw`], [1400, `c${tag}-move`]]) { await p.waitForTimeout(t); await p.screenshot({ path: `design-loop/shots/iw-${f}.png` }); }
  await p.waitForTimeout(5000);
}
console.log('url', new URL(p.url()).pathname, '| errors', errs.length ? errs.slice(0, 2) : 'none');
await b.close();
