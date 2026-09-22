import { chromium, webkit, devices } from '@playwright/test';
for (const [eng, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  const b = await eng.launch(name === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {});
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); p.setDefaultTimeout(150000);
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.goto('http://localhost:3300/', { waitUntil: 'load' }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const s = document.querySelector('.portal-robot'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY); });
  await p.waitForTimeout(10000); await p.screenshot({ path: `design-loop/shots/robot-phone-${name}-1.png` });
  await p.locator('.portal-robot__stage').tap(); await p.waitForTimeout(1500); await p.screenshot({ path: `design-loop/shots/robot-phone-${name}-2.png` });
  console.log(name, 'errors:', errs.length ? errs : 'none', '| ready:', await p.locator('.portal-robot__stage[data-ready]').count(), '| overflow:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await b.close();
}
