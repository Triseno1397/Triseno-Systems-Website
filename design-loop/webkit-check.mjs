import { webkit, devices } from '@playwright/test';
const base = process.env.BASE || 'https://trisenosystems.com';
const routes = ['/', '/studio', '/web-design-division', '/ai-infrastructure', '/work', '/contact'];
const b = await webkit.launch();
for (const r of routes) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push('CONSOLE ' + m.text().slice(0, 200)));
  await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(250); }
  const body = await p.evaluate(() => document.body.innerText.slice(0, 200));
  console.log(r, 'errors:', errs.length, /error|exception/i.test(body) ? ' BODY: ' + body.replace(/\s+/g, ' ').slice(0, 120) : '');
  [...new Set(errs)].slice(0, 5).forEach(e => console.log('   ', e));
  await ctx.close();
}
await b.close();
