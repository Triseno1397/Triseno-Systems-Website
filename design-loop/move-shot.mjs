import { chromium } from '@playwright/test';
/* The move as a visitor sees it: the portal's own camera, frozen at a series of
   instants (?opt=<sec>&opm=spin|jump). */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(150000);
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
const tag = process.env.TAG || '';
for (const f of (process.env.FRAMES || 'spin,2.4').split(';').filter(Boolean)) {
  const [move, t] = f.split(',');
  await p.goto(`${BASE}/?opt=${t}&opm=${move}&opc=body${process.env.EXTRA || ''}`, { waitUntil: 'load' });
  await p.waitForTimeout(Number(process.env.SETTLE || 12000));
  await p.screenshot({ path: `design-loop/shots/mv-${move}-${t}${tag}.png`, clip: { x: 980, y: 140, width: 460, height: 700 } });
}
console.log('errors', errs.length ? errs[0] : 'none');
await b.close();
