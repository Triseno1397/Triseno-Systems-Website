import { chromium } from '@playwright/test';
const BASE = process.env.BASE || 'http://localhost:3302';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const path of ['/', '/web-design-division', '/studio', '/work', '/contact']) {
  await p.goto(BASE + path, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const rails = await p.evaluate(() => [...document.querySelectorAll('main [data-rail]')].map((e) => {
    const r = e.getBoundingClientRect();
    const h = e.querySelector('h1,h2');
    return `${e.getAttribute('data-rail')} | top ${Math.round(r.top + scrollY)} h ${Math.round(r.height)} | ${h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 70) : ''}`;
  }));
  console.log('\n' + path + '\n  ' + rails.join('\n  '));
}
await b.close();
