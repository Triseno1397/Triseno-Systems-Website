import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Short video of the AI hero object: idle, then the pointer sweeping across it. */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'design-loop/vid', size: { width: 1440, height: 900 } } });
const p = await ctx.newPage();
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4500);
const box = await p.locator('.ai-core__stage').boundingBox();
await p.mouse.move(box.x - 60, box.y + box.height * 0.5);
await p.waitForTimeout(2500);
for (const [fx, fy] of [[0.3, 0.35], [0.55, 0.45], [0.75, 0.6], [0.6, 0.7], [0.4, 0.55], [0.5, 0.4]]) {
  await p.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 40 });
  await p.waitForTimeout(700);
}
await p.mouse.move(box.x + box.width + 80, box.y + box.height * 0.5, { steps: 20 });
await p.waitForTimeout(2500);
const path = await p.video().path();
await ctx.close(); await b.close();
fs.renameSync(path, 'design-loop/vid/ai-core.webm');
