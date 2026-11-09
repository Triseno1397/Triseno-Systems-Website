// Why does the first layout of a page's DOM cost what it does? On FROM, fetch
// TO's HTML, adopt its <main> into the live document and time the forced
// layout: once cold, once again with the same nodes re-inserted (layout tree
// rebuilt, fonts warm), and once with the web fonts stripped from the clone.
// env: BASE/PORT, FROM, TO, W, H
import { chromium } from '@playwright/test';
const W = +(process.env.W || 390), H = +(process.env.H || 844); const phone = W < 768;
const base = process.env.BASE || 'http://localhost:' + (process.env.PORT || 3300);
const FROM = process.env.FROM || '/'; const TO = process.env.TO || '/web-design-division';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
const p = await ctx.newPage();
await p.goto(base + FROM, { waitUntil: 'load' });
await p.waitForTimeout(5000);
const r = await p.evaluate(async (to) => {
  const html = await (await fetch(to)).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const main = doc.querySelector('main');
  const force = () => { const t = performance.now(); void document.body.offsetHeight; return +(performance.now() - t).toFixed(1); };
  const style = () => { const t = performance.now(); void getComputedStyle(document.body).color; return +(performance.now() - t).toFixed(1); };
  const out = { nodes: main.querySelectorAll('*').length, fontsBefore: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i) };
  const node = document.adoptNode(main);
  node.style.position = 'absolute'; node.style.top = '0'; node.style.left = '0'; node.style.width = '100%';
  force();
  document.body.appendChild(node); out.cold = { style: style(), layout: force() };
  await new Promise((r) => setTimeout(r, 1500));
  out.fontsAfter = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i);
  node.remove(); force();
  document.body.appendChild(node); out.warm = { style: style(), layout: force() };
  node.remove(); force();
  // the same DOM in a system font: is it the fonts?
  node.style.fontFamily = 'Arial'; node.querySelectorAll('*').forEach((el) => (el.style.fontFamily = 'Arial'));
  document.body.appendChild(node); out.arial = { style: style(), layout: force() };
  node.remove(); force();
  // and with every <img>/<picture>/<canvas>/<svg> removed
  node.querySelectorAll('*').forEach((el) => (el.style.fontFamily = ''));
  node.style.fontFamily = '';
  node.querySelectorAll('img, picture, canvas, svg, video').forEach((el) => el.remove());
  document.body.appendChild(node); out.noMedia = { style: style(), layout: force(), nodes: node.querySelectorAll('*').length };
  node.remove();
  return out;
}, TO);
console.log(JSON.stringify(r, null, 1));
await b.close();
