import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

/* CPU profile of a scroll, aggregated by function self-time.
   Run against the dev server so the names are real:
     node design-loop/profile-scroll.mjs http://localhost:3200/ [startY] [steps] */

const url = process.argv[2] || 'http://localhost:3200/';
const from = Number(process.argv[3] || 0);
const steps = Number(process.argv[4] || 120);

const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'],
});
const phone = process.env.PHONE === '1';
const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
if (phone) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(7000);
if (from) {
  await p.evaluate((y) => window.scrollTo(0, y), from);
  await p.waitForTimeout(1500);
}
if (!phone) await p.mouse.move(720, 450);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
for (let i = 0; i < steps; i++) {
  if (phone) await p.evaluate(() => window.scrollBy(0, 100)); else await p.mouse.wheel(0, 100);
  await p.waitForTimeout(45);
}
const { profile } = await cdp.send('Profiler.stop');
await b.close();

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame;
  const file = (f.url || '').split('/').pop().split('?')[0];
  const key = `${f.functionName || '(anon)'}  ${file}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + 1);
}
const ms = (profile.endTime - profile.startTime) / 1000;
console.log(`\n${url}  —  ${ms.toFixed(0)}ms wall, ${total} samples\n`);
console.log('self time by function (% of samples):');
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) {
  console.log('  ', ((v / total) * 100).toFixed(1).padStart(5) + '%', k);
}
fs.writeFileSync('design-loop/profile-scroll.json', JSON.stringify([...self.entries()].sort((a, b) => b[1] - a[1])));
