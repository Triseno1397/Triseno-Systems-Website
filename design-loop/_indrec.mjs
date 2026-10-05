import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Video: the industries grid, clicking through each card so its loop plays. */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'design-loop/vid', size: { width: 1440, height: 900 } } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(3500);
const grid = p.locator('.ai-chroma').first();
await grid.scrollIntoViewIfNeeded(); await p.waitForTimeout(3000);
const cards = p.locator('.ai-chroma__card');
for (let i = 1; i <= 4; i++) { await cards.nth(i % 4).click(); await p.waitForTimeout(3200); }
const playing = await p.evaluate(() => { const v = document.querySelector('.ai-chroma__loop'); return v ? { paused: v.paused, t: v.currentTime.toFixed(2), src: v.currentSrc.split('/').pop() } : null; });
console.log('loop', JSON.stringify(playing), 'errors', errs.length ? errs.join(' | ') : 'none');
const path = await p.video().path(); await ctx.close(); await b.close();
fs.renameSync(path, 'design-loop/vid/ai-industries.webm');
