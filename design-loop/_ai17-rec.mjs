import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Walkthrough video of the AI page: slow scroll with the pointer touching each
   section. W/H env for phone. */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: 'design-loop/vid', size: { width: W, height: H } }, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4000);
const move = async (fx, fy) => { if (!phone) await p.mouse.move(W * fx, H * fy, { steps: 25 }); };
await move(0.65, 0.4); await p.waitForTimeout(1500); await move(0.75, 0.55); await p.waitForTimeout(1000);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total - H; y += 140) {
  if (phone) await p.evaluate(yy => window.scrollTo({ top: yy }), y); else await p.mouse.wheel(0, 140);
  await p.waitForTimeout(phone ? 180 : 140);
  if (!phone && y % 1400 < 140) { await move(0.3 + Math.random() * 0.5, 0.35 + Math.random() * 0.3); }
}
await p.waitForTimeout(1500);
const path = await p.video().path(); await ctx.close(); await b.close();
fs.renameSync(path, `design-loop/vid/ai-page-${W}.webm`);
console.log('errors', errs.length ? errs.join(' | ') : 'none');
