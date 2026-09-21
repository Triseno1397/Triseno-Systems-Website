import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const routes = ['/', '/studio', '/web-design-division', '/ai-infrastructure', '/work', '/contact'];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const all = new Map(); const unnamed = [];
for (const r of routes) {
  await p.goto(base + r, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  const found = await p.evaluate(() => [...document.querySelectorAll('a[href], button')].map(e => ({ tag: e.tagName, href: e.getAttribute('href'), name: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) })));
  for (const f of found) { if (f.href) { const k = f.href; if (!all.has(k)) all.set(k, new Set()); all.get(k).add(r); } if (!f.name) unnamed.push(r + ' ' + f.tag + ' ' + (f.href || '')); }
}
const bad = [];
for (const [href, from] of all) {
  if (/^(mailto|tel):/.test(href) || href.startsWith('#')) continue;
  const url = href.startsWith('http') ? href : base + href;
  if (href.startsWith('http') && !href.includes('trisenosystems')) { console.log('external', href); continue; }
  const res = await p.request.get(url, { maxRedirects: 5 }).catch(e => ({ status: () => 'ERR' }));
  if (res.status() !== 200) bad.push(res.status() + ' ' + href + ' (from ' + [...from].join(',') + ')');
}
console.log('links checked:', all.size, '| broken:', bad.length); bad.forEach(x => console.log('  ', x));
console.log('controls without a name:', unnamed.length); unnamed.slice(0, 10).forEach(x => console.log('  ', x));
await b.close();
