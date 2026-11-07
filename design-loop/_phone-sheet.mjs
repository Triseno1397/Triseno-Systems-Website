import { chromium } from '@playwright/test';
/* phone screenshots of a page at N even scroll positions -> one sheet. env PORT PAGE N TAG */
const page = process.env.PAGE || '/'; const N = +(process.env.N || 10); const tag = process.env.TAG || 'ph';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:' + (process.env.PORT || 3403) + page + '?explore=off', { waitUntil: 'load' }); await p.waitForTimeout(3500);
const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const shots = [];
for (let i = 0; i < N; i++) {
  const y = Math.round(total * i / (N - 1));
  await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await p.waitForTimeout(900);
  shots.push(await p.screenshot());
}
await b.close();
const { default: sharp } = await import('sharp').catch(() => ({ default: null }));
import fs from 'node:fs';
fs.mkdirSync('design-loop/shots', { recursive: true });
shots.forEach((s, i) => fs.writeFileSync(`design-loop/shots/${tag}-${String(i).padStart(2, '0')}.png`, s));
console.log('ok', shots.length);
