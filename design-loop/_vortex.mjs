import { chromium } from '@playwright/test';
/* Filmstrip of the Creative vortex warp. FROM=/work N=frames EVERY=ms */
const BASE = process.env.BASE || 'http://localhost:3300';
const FROM = process.env.FROM || '/work';
const N = +(process.env.N || 12), EVERY = +(process.env.EVERY || 180);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(BASE + FROM + (process.env.Q || ''), { waitUntil: 'load' }); await p.waitForTimeout(7000);
await p.click('.morph-nav__trigger'); await p.waitForTimeout(800);
await p.click('#world-menu a[href="/studio"]');
for (let i = 0; i < N; i++) { await p.screenshot({ path: `design-loop/shots/vortex-${String(i).padStart(2, '0')}.png` }); await p.waitForTimeout(EVERY); }
await p.waitForFunction(() => window.__warpStats, null, { timeout: 15000 }).catch(() => {});
console.log('stats', JSON.stringify(await p.evaluate(() => window.__warpStats)));
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
