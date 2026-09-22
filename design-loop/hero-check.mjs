import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
await p.goto((process.env.BASE || 'http://localhost:3300') + '/', { waitUntil: 'load' }); await p.waitForTimeout(7000);
await p.screenshot({ path: 'design-loop/shots/h1-rest.png' });
const hint = await p.evaluate(() => { const h = document.querySelector('.portal-robot__hint'); const r = h.getBoundingClientRect(); return { text: h.textContent, op: getComputedStyle(h).opacity, y: Math.round(r.y), visible: r.y < innerHeight }; });
console.log('hint', JSON.stringify(hint));
const w = p.locator('a.portal-word').nth(2); const wb = await w.boundingBox();
await p.mouse.move(wb.x + 30, wb.y + wb.height / 2); await p.waitForTimeout(2200); await p.screenshot({ path: 'design-loop/shots/h2-hover-ai.png' });
const st = await p.locator('.portal-robot').boundingBox();
await p.mouse.move(st.x + st.width / 2, st.y + st.height * 0.45); await p.waitForTimeout(600);
await p.mouse.click(st.x + st.width / 2, st.y + st.height * 0.45);
for (const [t, f] of [[1400, 'h3-forge'], [1400, 'h4-strike'], [1200, 'h5-strike2']]) { await p.waitForTimeout(t); await p.screenshot({ path: `design-loop/shots/${f}.png` }); }
console.log('url after click', new URL(p.url()).pathname, '| errors', errs.length ? errs.slice(0, 2) : 'none');
await b.close();
