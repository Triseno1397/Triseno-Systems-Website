import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
for (const word of ['CREATIVE', 'WEB DESIGN', 'AI INFRASTRUCTURE', 'WORK', 'CONTACT']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await p.goto(base + '/', { waitUntil: 'load' }); await p.waitForTimeout(6000);
  const link = p.locator('a.portal-word', { hasText: new RegExp('^' + word + '$', 'i') }).first();
  const n = await link.count();
  const box = n ? await link.boundingBox() : null;
  let topEl = 'n/a';
  if (box) topEl = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + String(e.className).split(' ').slice(0, 2).join('.') : 'null'; }, [box.x + box.width / 2, box.y + box.height / 2]);
  if (box) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(700); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); }
  await p.waitForTimeout(4500);
  console.log(word.padEnd(18), 'count', n, '| under cursor:', topEl.padEnd(28), '| url:', new URL(p.url()).pathname, errs.length ? '| ERR ' + errs[0] : '');
  await p.close();
}
await b.close();
