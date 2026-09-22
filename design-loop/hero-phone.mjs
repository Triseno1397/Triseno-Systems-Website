import { chromium, webkit, devices } from '@playwright/test';
for (const [eng, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  const b = await eng.launch(name === 'chromium' ? { headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] } : {});
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); p.setDefaultTimeout(90000);
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 140)));
  await p.goto('http://localhost:3300/', { waitUntil: 'load' }); await p.waitForTimeout(9000);
  await p.screenshot({ path: `design-loop/shots/ph-${name}-1.png` });
  const st = await p.locator('.portal-robot').boundingBox();
  if (st) { await p.tap('.portal-robot', { position: { x: st.width / 2, y: st.height * 0.4 } }).catch(() => {}); await p.waitForTimeout(2600); await p.screenshot({ path: `design-loop/shots/ph-${name}-2.png` }); }
  console.log(name, 'robot box', st && [st.x, st.y, st.width, st.height].map(Math.round), '| overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), '| errors', errs.length ? errs[0] : 'none');
  await b.close();
}
