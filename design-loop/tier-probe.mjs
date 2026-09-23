import { chromium } from '@playwright/test';

/* At the visitor's real frame size: which tier and pixel ratio the portal is
   running at after it settles, and the frame rate at rest and with the
   pointer moving. node design-loop/tier-probe.mjs [path] [width] [height] */

const base = process.env.BASE || 'http://localhost:3300';
const path = process.argv[2] || '/';
const W = Number(process.argv[3] || 1920), H = Number(process.argv[4] || 1080);
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: W, height: H } });
p.setDefaultTimeout(60000);
// CSS=rule: injected at DOMContentLoaded, to take a DOM layer out of the frame
if (process.env.CSS) await p.addInitScript((css) => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }); }, process.env.CSS);
const fps = (ms) => p.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }), ms);
await p.goto(base + path, { waitUntil: 'load' });
await p.waitForTimeout(12000);
const read = () => p.evaluate(() => ({ tier: document.documentElement.dataset.portalTier, dpr: document.documentElement.dataset.portalDpr, loader: !!document.querySelector('.world-loader') }));
const rest = await fps(3000);
const a = await read();
// the pointer sweeps across him for three seconds
const t0 = Date.now();
const moving = fps(3000);
while (Date.now() - t0 < 3000) { const k = (Date.now() - t0) / 3000; await p.mouse.move(W * (0.2 + 0.6 * Math.abs(Math.sin(k * 6))), H * (0.3 + 0.4 * Math.abs(Math.cos(k * 4)))); await p.waitForTimeout(16); }
const mv = await moving;
const bb = await read();
await b.close();
console.log('\n' + path + ' at ' + W + 'x' + H + ':  tier ' + a.tier + ' (dpr ' + a.dpr + ') after 12s;  ' + rest + 'fps at rest, ' + mv + 'fps with the pointer moving;  tier after: ' + bb.tier + (a.loader ? ';  LOADER STILL UP' : ''));
