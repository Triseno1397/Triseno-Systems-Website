import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* The link-preview cards: 1200x630, one per division and a default, in the
   site's own type and hues. node design-loop/og-render.mjs */
// inlined: a page set with setContent() has no origin a file:// image may load from
const logo = 'data:image/png;base64,' + fs.readFileSync('public/images/triseno-logo-v2.png').toString('base64');
const cards = [
  { file: 'default', hue: '#ffffff', eyebrow: 'TRISENO SYSTEMS', title: 'Ad creative.\nWeb design.\nAI infrastructure.', sub: 'Three divisions, one standard.' },
  { file: 'studio', hue: '#f2a93b', eyebrow: 'TRISENO STUDIO', title: 'Paid social\nad creative.', sub: 'UGC, product demos, direct response, brand films — delivered in days.' },
  { file: 'web-design', hue: '#a78bfa', eyebrow: 'WEB DESIGN DIVISION', title: 'Custom websites,\nbuilt to convert.', sub: 'Strategy, design, build. 90+ performance. No templates.' },
  { file: 'ai-infrastructure', hue: '#22d3ee', eyebrow: 'AI INFRASTRUCTURE', title: 'The intelligence layer\na business runs on.', sub: 'Consulting, architecture, implementation.' },
];
const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=Geist:wght@400;500&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
<style>
html,body{margin:0;width:1200px;height:630px;background:#0b0b0d;overflow:hidden}
.card{position:relative;width:1200px;height:630px;font-family:Unbounded,system-ui,sans-serif;color:#f4f4f5}
.glow{position:absolute;inset:0;background:radial-gradient(60% 70% at 84% 50%, ${c.hue}33 0%, transparent 70%),radial-gradient(40% 40% at 10% 100%, ${c.hue}1a 0%, transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(70% 70% at 50% 50%,#000 30%,transparent 100%);-webkit-mask-image:radial-gradient(70% 70% at 50% 50%,#000 30%,transparent 100%)}
.rule{position:absolute;left:72px;top:96px;width:44px;height:3px;background:${c.hue}}
.eyebrow{position:absolute;left:72px;top:112px;font-family:'Geist Mono',monospace;font-weight:500;font-size:20px;letter-spacing:.28em;color:${c.hue}}
.title{position:absolute;left:72px;top:170px;font-weight:700;font-size:64px;line-height:1.08;letter-spacing:.02em;white-space:pre-line;max-width:820px}
.sub{position:absolute;left:72px;bottom:92px;font-family:Geist,system-ui,sans-serif;font-weight:400;font-size:25px;color:#c9c9cf;max-width:700px;line-height:1.35}
.url{position:absolute;right:72px;bottom:92px;font-family:'Geist Mono',monospace;font-size:20px;letter-spacing:.14em;color:#8a8a92}
.logo{position:absolute;right:72px;top:72px;width:230px;height:150px;object-fit:contain;object-position:right top;filter:drop-shadow(0 0 24px ${c.hue}55)}
</style></head><body><div class="card"><div class="glow"></div><div class="grid"></div>
<img class="logo" src="${logo}"><div class="rule"></div><div class="eyebrow">${c.eyebrow}</div>
<div class="title">${c.title}</div><div class="sub">${c.sub}</div><div class="url">trisenosystems.com</div></div></body></html>`;
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const c of cards) {
  await p.setContent(html(c), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'public/og/' + c.file + '.png', type: 'png' });
  console.log('public/og/' + c.file + '.png');
}
await b.close();
