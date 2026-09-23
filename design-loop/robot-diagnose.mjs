import { chromium } from '@playwright/test';
import fs from 'node:fs';

/* Three questions about the portal, answered with evidence:
   1. how long the loader holds, and what it waits on (DOM marks over time);
   2. how big the Operator is on screen, measured off the screenshot — the
      WebGL canvas cannot be read back, but a PNG of the page can;
   3. what the move looks like frame by frame after a click (a contact sheet).
   node design-loop/robot-diagnose.mjs [compareWith.png] */

const base = process.env.BASE || 'http://localhost:3300';
const compareWith = process.argv[2] || 'design-loop/shots/sh-rest.png';

const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(150000);

// 1. the loader ────────────────────────────────────────────────────────────
await p.addInitScript(() => {
  const t0 = performance.now();
  const marks = [];
  window.__marks = marks;
  const seen = {};
  const mark = (what) => {
    if (seen[what]) return;
    seen[what] = true;
    marks.push([what, Math.round(performance.now() - t0)]);
  };
  window.addEventListener('load', () => mark('load event'));
  // document exists at init time; documentElement does not yet
  const mo = new MutationObserver(() => {
    if (document.querySelector('canvas')) mark('first canvas');
    const world = document.querySelector('[data-world-layer]');
    if (world && world.hasAttribute('data-scene-ready')) mark('scene ready');
    const loader = document.querySelector('.world-loader');
    if (loader) seen.__loader = true;
    if (loader && loader.hasAttribute('data-leaving')) mark('loader leaving');
    if (!loader && seen.__loader) mark('loader gone');
    if (document.documentElement && document.documentElement.hasAttribute('data-content-fade')) mark('hydrated');
  });
  mo.observe(document, { subtree: true, childList: true, attributes: true });
});
await p.goto(base + '/', { waitUntil: 'commit' });
await p.waitForTimeout(14000);
const marks = await p.evaluate(() => window.__marks);
console.log('\nLOADER timeline (ms after navigation):');
for (const [what, t] of marks) console.log('  ', String(t).padStart(6), what);
const res = await p.evaluate(() => {
  const r = performance.getEntriesByType('resource');
  return r
    .filter((e) => e.transferSize > 150000)
    .map((e) => [e.name.split('/').pop().slice(0, 40), Math.round(e.transferSize / 1024) + 'KB', Math.round(e.responseEnd) + 'ms'])
    .sort((a, c) => parseInt(c[2]) - parseInt(a[2]))
    .slice(0, 6);
});
console.log('  largest resources (name, size, finished at):');
for (const row of res) console.log('    ', row.join('  '));

// 2. his size on screen ───────────────────────────────────────────────────
await p.waitForTimeout(1500);
await p.screenshot({ path: 'design-loop/shots/diag-hero.png' });

const measure = async (file) => {
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const data = fs.readFileSync(file).toString('base64');
  const out = await pg.evaluate(async (src) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // chrome highlights are near-white; the signature loop is too, so the
    // bands are chosen to the right of where the loop ends
    const bands = [[0.72, 0.97], [0.8, 0.97]];
    const res = {};
    for (const [a, z] of bands) {
      const x0 = Math.floor(img.width * a), x1 = Math.floor(img.width * z);
      const d = g.getImageData(x0, 0, x1 - x0, img.height).data;
      const W = x1 - x0;
      let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) {
          const px = (i / 4) % W, py = Math.floor(i / 4 / W);
          if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; n++;
        }
      }
      res[a + '-' + z] = maxX < 0 ? 'none' : { x: x0 + minX, y: minY, w: maxX - minX, h: maxY - minY, brightPx: n };
    }
    return res;
  }, data);
  await pg.close();
  return out;
};
console.log('\nOPERATOR bright-pixel boxes (band of the width: box):');
console.log('  now      ', JSON.stringify(await measure('design-loop/shots/diag-hero.png')));
if (fs.existsSync(compareWith)) console.log('  compared ', JSON.stringify(await measure(compareWith)), '<-', compareWith);

// 3. the move, frame by frame ─────────────────────────────────────────────
await p.mouse.move(720, 450);
await p.waitForTimeout(500);
await p.mouse.click(Math.round(1440 * 0.8), Math.round(900 * 0.62));
const frames = [];
const t0 = Date.now();
for (let i = 0; i < 40; i++) {
  const buf = await p.screenshot({ type: 'jpeg', quality: 60, clip: { x: 860, y: 60, width: 580, height: 840 } });
  frames.push({ t: Date.now() - t0, data: buf.toString('base64') });
  await p.waitForTimeout(60);
}
await b.close();
const W = 216, H = Math.round((216 * 840) / 580), per = 8;
const html =
  '<body style="margin:0;background:#111;font:11px monospace;color:#bbb"><div style="display:grid;grid-template-columns:repeat(' + per + ',' + W + 'px);gap:6px;padding:6px">' +
  frames.map((f) => '<div><div style="padding:2px 0 3px">+' + f.t + 'ms</div><img src="data:image/jpeg;base64,' + f.data + '" style="width:' + W + 'px;height:' + H + 'px;display:block"></div>').join('') +
  '</div></body>';
const b2 = await chromium.launch({ headless: true });
const pg = await b2.newPage({ viewport: { width: per * (W + 6) + 6, height: Math.ceil(frames.length / per) * (H + 22) + 6 } });
await pg.setContent(html);
await pg.screenshot({ path: 'design-loop/shots/diag-move.png', fullPage: true });
await b2.close();
console.log('\nMOVE contact sheet: design-loop/shots/diag-move.png (' + frames.length + ' frames, ~' + Math.round(frames[frames.length - 1].t / frames.length) + 'ms apart)');
