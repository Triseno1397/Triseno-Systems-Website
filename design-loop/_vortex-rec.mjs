import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Records the Creative vortex warp to video (design-loop/vid/vortex-*.webm).
   FROM=/work VW=1280 VH=800 */
const BASE = process.env.BASE || 'http://localhost:3300';
const FROM = process.env.FROM || '/work';
const W = +(process.env.VW || 1280), H = +(process.env.VH || 800);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: 'design-loop/vid', size: { width: W, height: H } }, isMobile: W < 768, hasTouch: W < 768 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto(BASE + FROM, { waitUntil: 'load' }); await p.waitForTimeout(6000);
await p.click('.morph-nav__trigger'); await p.waitForTimeout(1000);
const t0 = Date.now();
await p.click('#world-menu a[href="/studio"]');
await p.waitForFunction(() => window.__warpStats, null, { timeout: 15000 });
const stats = await p.evaluate(() => window.__warpStats);
await p.waitForTimeout(1500);
const path = await p.video().path();
await ctx.close(); await b.close();
const out = `design-loop/vid/vortex-${W}.webm`; fs.renameSync(path, out);
console.log(JSON.stringify({ out, stats, clickAt: t0, errors: errs }));
