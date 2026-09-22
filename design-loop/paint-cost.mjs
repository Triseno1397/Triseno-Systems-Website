import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* What the compositor does during a scroll of one section: paint, raster and
   layer work, which a CPU profile does not show.
   node design-loop/paint-cost.mjs <url> <startY> [steps] */
const url = process.argv[2];
const from = Number(process.argv[3] || 0);
const steps = Number(process.argv[4] || 80);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(150000);
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(7000);
if (from) { await p.evaluate((y) => window.scrollTo(0, y), from); await p.waitForTimeout(1500); }
await p.mouse.move(720, 450);
await b.startTracing(p, { path: 'design-loop/trace-paint.json', categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(45); }
await b.stopTracing();
await b.close();
const ev = (JSON.parse(fs.readFileSync('design-loop/trace-paint.json')).traceEvents || []);
const sum = {};
let painted = 0;
for (const e of ev) {
  if (!e.dur) continue;
  if (['Paint', 'RasterTask', 'UpdateLayerTree', 'Layerize', 'CompositeLayers', 'PaintImage', 'Decode Image', 'ImageDecodeTask', 'GPUTask'].includes(e.name)) {
    sum[e.name] = (sum[e.name] || 0) + e.dur;
  }
  if (e.name === 'Paint' && e.args?.data?.clip) {
    const c = e.args.data.clip;
    painted += Math.abs((c[2] - c[0]) * (c[5] - c[1])) / 1e6;
  }
}
const secs = steps * 0.045;
console.log('\n' + url + '  from y=' + from);
for (const [k, v] of Object.entries(sum).sort((a, c) => c[1] - a[1])) console.log('  ', (v / 1000 / secs).toFixed(0).padStart(5) + ' ms/s', k);
console.log('   painted area:', painted.toFixed(1), 'megapixels total');
