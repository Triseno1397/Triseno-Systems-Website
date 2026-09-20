import { chromium, devices } from '@playwright/test';
const b = await chromium.launch();
const m = await b.newPage({ ...devices['iPhone 13'] });
await m.goto('http://localhost:3200/ai-infrastructure', { waitUntil: 'domcontentloaded', timeout: 120000 });
await m.waitForTimeout(6000);
console.log(JSON.stringify(await m.evaluate(() => {
  const p = document.querySelector('.ai-poster');
  return {
    vb: p.getAttribute('viewBox'),
    kids: Array.from(p.children).map(el => {
      let box = null;
      try { const r = el.getBBox(); box = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; } catch {}
      return { tag: el.tagName, dlen: (el.getAttribute('d') || '').length, stroke: el.getAttribute('stroke'), so: el.getAttribute('stroke-opacity'), fill: el.getAttribute('fill'), box };
    }),
  };
}, ), null, 1));
// isolate the world: hide every section and shoot it
await m.evaluate(() => document.querySelectorAll('main.ai-world > section, main.ai-world > div:not(.ai-world__scene)').forEach(e => e.style.visibility = 'hidden'));
await m.waitForTimeout(400);
await m.screenshot({ path: 'tmp-world-mobile.png' });
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto('http://localhost:3200/ai-infrastructure', { waitUntil: 'domcontentloaded', timeout: 120000 });
await d.waitForTimeout(6000);
await d.evaluate(() => document.querySelectorAll('main.ai-world > section, main.ai-world > div:not(.ai-world__scene)').forEach(e => e.style.visibility = 'hidden'));
await d.waitForTimeout(400);
await d.screenshot({ path: 'tmp-world-desktop.png' });
await b.close();
