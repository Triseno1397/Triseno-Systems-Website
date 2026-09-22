import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(120000);
const frames = (process.env.FRAMES || '').split(';').filter(Boolean);
for (const f of frames) {
  const [move, t, cam] = f.split(',');
  await p.goto(`http://localhost:3300/?opt=${t}&opm=${move}&opc=${cam}${process.env.EXTRA || ""}`, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const s = document.querySelector('.portal-robot'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY); });
  await p.waitForTimeout(5500);
  const st = await p.locator('.portal-robot__stage').boundingBox();
  await p.screenshot({ path: `design-loop/shots/fz-${move}-${t}-${cam}${process.env.TAG || ""}.png`, clip: { x: st.x + st.width * 0.1, y: st.y, width: st.width * 0.8, height: st.height } });
}
await b.close();
