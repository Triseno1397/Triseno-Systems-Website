import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const [route, selector] = [process.argv[2], process.argv[3]];
const variants = JSON.parse(process.env.VARIANTS);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
for (const [name, css] of Object.entries(variants)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const cdp = await p.context().newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto(base + route, { waitUntil: 'load' }); await p.addStyleTag({ content: css || '/**/' }); await p.waitForTimeout(5000);
  const top = await p.evaluate(sel => { const el = document.querySelector(sel); return el.getBoundingClientRect().top + scrollY; }, selector);
  await p.evaluate(y => scrollTo(0, y - 50), top); await p.waitForTimeout(1200); await p.mouse.move(720, 450);
  await p.evaluate(() => { window.__f = []; let last = performance.now(); const loop = t => { window.__f.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])); const t0 = Date.now();
  for (let d = 0; d < 1400; d += 100) { await p.mouse.wheel(0, 100); await p.waitForTimeout(45); }
  await p.waitForTimeout(600);
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])); const sec = (Date.now() - t0) / 1000;
  const f = (await p.evaluate(() => window.__f)).slice(3); const s = [...f].sort((a, b) => a - b);
  console.log(route, name.padEnd(12), 'fps', (1000 / (f.reduce((a, b) => a + b) / f.length)).toFixed(0), 'p95', s[Math.floor(s.length * .95)].toFixed(0), 'jank', (100 * f.filter(x => x > 33).length / f.length).toFixed(1) + '%', 'style ms/s', Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) / sec * 1000), 'script', Math.round((m1.ScriptDuration - m0.ScriptDuration) / sec * 1000));
  await p.close();
}
await b.close();
