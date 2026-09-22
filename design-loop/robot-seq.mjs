import { chromium } from '@playwright/test';
const headed = process.env.HEADED === '1';
const b = await chromium.launch(headed ? { headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] } : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(150000);
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
await p.goto((process.env.BASE || 'http://localhost:3300') + '/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
await p.evaluate(() => { const s = document.querySelector('.portal-robot'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY); });
await p.waitForTimeout(8000);
const st = await p.locator('.portal-robot__stage').boundingBox();
const clip = { x: st.x + st.width * 0.1, y: st.y, width: st.width * 0.8, height: st.height };
for (const tag of ['A', 'B']) {
  await p.mouse.click(st.x + st.width / 2, st.y + st.height / 2);
  const t0 = Date.now(); const shots = (process.env.AT || '300,700,1100,1500,1900,2600,3400,4300,5400,6800').split(',').map(Number);
  for (const at of shots) { const w = at - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `design-loop/shots/seq-${tag}-${String(at).padStart(5, '0')}.png`, clip }); }
  await p.waitForTimeout(3000);
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
