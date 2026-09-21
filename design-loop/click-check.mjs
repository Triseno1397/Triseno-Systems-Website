import { chromium, devices } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const routes = ['/', '/studio', '/web-design-division', '/ai-infrastructure', '/work', '/contact'];
const mobile = process.env.MOBILE === '1';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const blocked = new Map();
for (const r of routes) {
  const ctx = await b.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = mobile ? 664 : 900;
  for (let y = 0; y < H; y += Math.round(vh * 0.5)) {
    await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(900);
    const res = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('a[href], button, [role=button], input, select, textarea')) {
        const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
        if (rc.width < 4 || rc.height < 4 || rc.bottom < 90 || rc.top > innerHeight - 90 || rc.right < 0 || rc.left > innerWidth) continue;
        // skip things that are intentionally invisible / inert
        let n = el, hidden = false; while (n && n !== document.body) { const c = getComputedStyle(n); if (+c.opacity < 0.2 || c.visibility === 'hidden' || c.pointerEvents === 'none' || n.inert || n.getAttribute('aria-hidden') === 'true') { hidden = true; break; } n = n.parentElement; }
        if (hidden) continue;
        const x = rc.left + rc.width / 2, y = rc.top + rc.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (hit && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].some(l => l.contains(hit))))
          out.push(((el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 30)) + '  <-covered by  ' + hit.tagName.toLowerCase() + '.' + String(hit.className).split(' ')[0]);
      }
      return out;
    });
    res.forEach(x => blocked.set(r + ' :: ' + x, (blocked.get(r + ' :: ' + x) || 0) + 1));
  }
  await ctx.close();
}
console.log(mobile ? 'PHONE' : 'DESKTOP', 'covered controls:', blocked.size); [...blocked.keys()].forEach(k => console.log('  ', k));
await b.close();
