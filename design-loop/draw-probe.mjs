import { chromium } from '@playwright/test';
process.on('unhandledRejection', (e) => { console.error('probe failed:', e && e.message ? e.message : e); process.exit(1); });
/* What one portal frame costs the GPU in draws: calls, triangles, programs,
   textures, geometries. node design-loop/draw-probe.mjs */
const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(base + '/?dbg=Hg', { waitUntil: 'load' });
await p.waitForTimeout(12000);
console.log('url after 12s:', p.url());
await p.evaluate(() => { window.__gl.info.autoReset = false; window.__gl.info.reset(); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
const info = await p.evaluate(() => { const i = window.__gl.info; return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points, lines: i.render.lines, programs: i.programs.length, geometries: i.memory.geometries, textures: i.memory.textures, size: window.__gl.domElement.width + 'x' + window.__gl.domElement.height }; });
console.log(JSON.stringify(info));
await b.close();
