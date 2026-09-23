import { chromium } from '@playwright/test';
/* One 1080p frame of the portal per post-chain switch, for a side-by-side.
   node design-loop/post-shots.mjs H H8 Hs8 */
const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
for (const f of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(base + '/?dbg=' + f, { waitUntil: 'load' });
  await p.mouse.move(1500, 400);
  await p.waitForTimeout(13000);
  await p.screenshot({ path: 'design-loop/shots/post-' + f + '.png' });
  await p.close();
  console.log('post-' + f + '.png');
}
await b.close();
