import { chromium } from '@playwright/test';
import fs from 'fs';
const CSSX = process.env.CSSX;
const route = process.argv[2]; const ys = process.argv[3].split(',').map(Number);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
for (const [tag, q, css] of [['js', '', ''], ['css', '?perf-nf', CSSX]]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3300' + route + q, { waitUntil: 'load' }); if (css) await p.addStyleTag({ content: css }); await p.waitForTimeout(4000);
  for (const y of ys) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(2500); await p.screenshot({ path: `design-loop/shots/fade-${tag}-${y}.png`, clip: { x: 0, y: 0, width: 1440, height: 240 } }); }
  await p.close();
}
await b.close();
