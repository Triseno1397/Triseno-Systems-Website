import { chromium, devices } from '@playwright/test';
/* Every section of every page on a phone, as one contact sheet per page.
   node design-loop/phone-sheet.mjs [/route,...]  */
const base = process.env.BASE || 'http://localhost:3300';
const routes = (process.argv[2] || '/,/studio,/web-design-division,/ai-infrastructure,/work,/contact').split(',');
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
for (const r of routes) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage(); p.setDefaultTimeout(150000);
  await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(10000);
  const secs = await p.evaluate(() => {
    const list = [...document.querySelectorAll('main section, main [data-rail]')].filter((el) => el.getBoundingClientRect().height > 200);
    const seen = new Set(); const res = [];
    for (const el of list) { const rr = el.getBoundingClientRect(); const top = Math.round(rr.top + scrollY); const name = (el.getAttribute('data-rail') || el.getAttribute('aria-label') || el.className.split(' ')[0] || el.tagName).slice(0, 22); if ([...seen].some((t) => Math.abs(t - top) < 150)) continue; seen.add(top); res.push({ name, top, h: Math.round(rr.height) }); }
    return res.sort((a, c) => a.top - c.top);
  });
  const shots = [];
  for (const s of secs) {
    // two frames for tall sections: its top, and a screen further in
    const ys = s.h > 1400 ? [s.top, s.top + 844] : [s.top];
    for (const y of ys) {
      await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(2200);
      const buf = await p.screenshot({ type: 'jpeg', quality: 70 });
      shots.push({ label: s.name + (y > s.top ? ' +1' : ''), data: buf.toString('base64') });
    }
  }
  await ctx.close();
  const W = 300, H = Math.round(300 * 844 / 390), per = 5;
  const rows = Math.ceil(shots.length / per);
  const html = `<body style="margin:0;background:#111;font:12px monospace;color:#ccc"><div style="display:grid;grid-template-columns:repeat(${per},${W}px);gap:10px;padding:10px">${shots.map((s) => `<div><div style="padding:3px 0 5px">${s.label}</div><img src="data:image/jpeg;base64,${s.data}" style="width:${W}px;height:${H}px;display:block;border:1px solid #333"></div>`).join('')}</div></body>`;
  const pg = await b.newPage({ viewport: { width: per * (W + 10) + 10, height: rows * (H + 30) + 10 } });
  await pg.setContent(html); await pg.waitForTimeout(500);
  const name = r === '/' ? 'portal' : r.slice(1);
  await pg.screenshot({ path: `design-loop/shots/phone-${name}.png`, fullPage: true });
  await pg.close();
  console.log(name, shots.length, 'frames');
}
await b.close();
