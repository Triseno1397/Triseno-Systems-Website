import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const base = process.env.BASE || 'https://trisenosystems.com';
const routes = (process.env.ROUTES || '/,/studio,/web-design-division,/ai-infrastructure,/work,/contact').split(',');
const profiles = [ ['iphone', devices['iPhone 13']], ['android', { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } }] ];
const settle = async (pg, max = 8000) => { const t0 = Date.now(); let last = null, st = 0;
  while (Date.now() - t0 < max) { const y = await pg.evaluate(() => Math.round(scrollY)).catch(() => null);
    if (y === last) { if (++st >= 3) return; } else st = 0; last = y; await pg.waitForTimeout(200); } };
const report = {};
for (const [pname, dev] of profiles) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const r of routes) {
    const slug = (r === '/' ? 'portal' : r.slice(1)).replace(/\//g, '_');
    const out = `design-loop/shots/phone/${pname}-${slug}/`; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
    const ctx = await b.newContext({ ...dev }); const p = await ctx.newPage(); p.setDefaultTimeout(120000);
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
    p.on('response', res => { if (res.status() >= 400) errs.push(res.status() + ' ' + res.url().slice(0, 120)); });
    await p.goto(base + r, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
    const vh = dev.viewport.height; const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const issues = new Set(); let k = 0;
    for (let y = 0; y <= H; y += Math.round(vh * 0.7)) {
      await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(500); await settle(p);
      await p.screenshot({ path: out + String(k++).padStart(2, '0') + '.png' });
      const found = await p.evaluate(() => { const o = []; const W = innerWidth;
        if (document.documentElement.scrollWidth > W + 1) o.push('page overflow x ' + (document.documentElement.scrollWidth - W));
        for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
          const rc = el.getBoundingClientRect(); if (rc.width === 0 || rc.height === 0 || rc.bottom < 0 || rc.top > innerHeight) continue;
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
          if (own && parseFloat(cs.fontSize) < 11) o.push('tiny text ' + cs.fontSize + ' "' + el.textContent.trim().slice(0, 30) + '"');
          if (own && (rc.right > W + 2 || rc.left < -2) && !el.closest('[aria-hidden="true"],.marquee,[data-marquee],[class*=marquee],[class*=strip],[class*=film],[class*=track],[class*=reel]')) o.push('text off-screen "' + el.textContent.trim().slice(0, 30) + '" ' + Math.round(rc.left) + '..' + Math.round(rc.right));
          if (el.matches('a,button,input,select,textarea,[role=button]') && (rc.width < 24 || rc.height < 24)) o.push('small target ' + Math.round(rc.width) + 'x' + Math.round(rc.height) + ' ' + (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 30));
        } return o; });
      found.forEach(f => issues.add(f));
      if (k > 40) break;
    }
    report[`${pname} ${r}`] = { height: H, shots: k, errors: [...new Set(errs)].slice(0, 8), issues: [...issues].slice(0, 25) };
    await ctx.close(); console.log('done', pname, r, k, 'shots');
  }
  await b.close();
}
fs.writeFileSync('design-loop/shots/phone/report.json', JSON.stringify(report, null, 1));
