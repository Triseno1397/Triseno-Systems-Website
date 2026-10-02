import { chromium } from '@playwright/test';
/* AI hero object: stills (idle, pointer on the globe), errors, frame rate. */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const errs = [];
for (const [name, w, h] of [['desk', 1440, 900], ['phone', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: name === 'phone' ? 2 : 1 });
  p.on('pageerror', e => errs.push(name + ': ' + String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text().slice(0, 200)); });
  await p.goto(BASE + '/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const box = await p.locator('.ai-core__stage').boundingBox();
  await p.locator('.ai-core').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `design-loop/shots/core-${name}.png` });
  if (box && name === 'desk') {
    await p.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.42, { steps: 8 });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `design-loop/shots/core-${name}-hover.png`, clip: box });
    const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
    console.log('fps', fps);
  }
  await p.close();
}
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
