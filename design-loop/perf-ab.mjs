import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const route = process.argv[2] || '/studio';
const variants = {
  none: '',
  noShaft: '[class*="plate__shaft"]{display:none!important}',
  noHaze: '[class*="plate__haze"],[class*="scene__haze"]{display:none!important}',
  noDust: '[class*="plate__dust"]{display:none!important}',
  noLight: '.world-plate__light{display:none!important}',
  noSpillTint: '.world-plate__spill,.world-plate__tint{display:none!important}',
  noBlend: '[class*="plate__"],[class*="scene__"]{mix-blend-mode:normal!important}',
  noAnim: '[class*="plate__"],[class*="scene__"]{animation:none!important}',
};
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
for (const [name, css] of Object.entries(variants)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(base + route, { waitUntil: 'load' }); await p.addStyleTag({ content: css || '/* base */' }); await p.waitForTimeout(5000); await p.mouse.move(720, 450);
  await p.evaluate(() => { window.__f = []; let last = performance.now(); const loop = t => { window.__f.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  for (let i = 0; i < 200; i++) { await p.mouse.wheel(0, 100); if (i % 4 === 0) await p.mouse.move(300 + (i * 37) % 900, 250 + (i * 53) % 450); await p.waitForTimeout(45); }
  const f = (await p.evaluate(() => window.__f)).slice(3); const s = [...f].sort((a, b) => a - b);
  console.log(route, name.padEnd(11), 'fps', (1000 / (f.reduce((a, b) => a + b) / f.length)).toFixed(1), 'p95', s[Math.floor(s.length * .95)].toFixed(1), 'jank', (100 * f.filter(x => x > 33).length / f.length).toFixed(1) + '%');
  await p.close();
}
await b.close();
