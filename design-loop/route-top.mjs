import { webkit, chromium, devices } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const hops = [['/studio', '/web-design-division'], ['/web-design-division', '/ai-infrastructure'], ['/ai-infrastructure', '/work'], ['/work', '/contact'], ['/', '/studio'], ['/contact', '/']];
for (const [engine, name] of [[webkit, 'webkit-iphone'], [chromium, 'chromium-desktop']]) {
  const b = await engine.launch();
  const ctx = await b.newContext(name.includes('iphone') ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(60000);
  for (const [from, to] of hops) {
    await p.goto(base + from, { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6)); await p.waitForTimeout(1200);
    const y0 = await p.evaluate(() => Math.round(scrollY));
    // follow a real in-page link to the destination (client-side navigation, warp included)
    const ok = await p.evaluate(to => { const a = [...document.querySelectorAll('a[href]')].find(a => a.getAttribute('href') === to || a.getAttribute('href')?.startsWith(to + '?')); if (!a) return false; a.click(); return true; }, to);
    if (!ok) { console.log(name, from, '->', to, 'no link found'); continue; }
    await p.waitForURL(u => u.pathname === to, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(3000);
    const y1 = await p.evaluate(() => Math.round(scrollY));
    console.log(name.padEnd(17), (from + ' -> ' + to).padEnd(42), 'scrolled', String(y0).padStart(5), '| landed at y =', y1, y1 === 0 ? 'OK' : 'FAIL', '| url', new URL(p.url()).pathname);
  }
  await b.close();
}
