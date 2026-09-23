import { chromium } from '@playwright/test';

/* What a link feels like: from the click to the destination being drawn, and
   the longest frame gap on the way (the warp plays across the hop).
   node design-loop/nav-lag.mjs */

const base = process.env.BASE || 'http://localhost:3300';
const hops = (process.env.HOPS ? JSON.parse(process.env.HOPS) : null) || [
  ['/', '/studio', 'a[href="/studio"]'],
  ['/studio', '/web-design-division', 'a[href="/web-design-division"]'],
  ['/web-design-division', '/ai-infrastructure', 'a[href="/ai-infrastructure"]'],
  // links that are actually on those pages: the AI gate's contact CTA, the
  // work index's gate, and the lockup home link; a link inside the closed
  // menu is opened first
  ['/ai-infrastructure', '/contact', 'main a[href^="/contact"]'],
  ['/work', '/contact', 'main a[href="/contact"]'],
  ['/contact', '/', 'a[href="/"]'],
];
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
// WARM=<path>: a separate context loads this page first (its own renderer,
// the same GPU process), to tell a per-browser cost from a per-page one
if (process.env.WARM) { const w = await b.newContext({ viewport: { width: 1440, height: 900 } }); const wp = await w.newPage(); await wp.goto(base + process.env.WARM, { waitUntil: "load" }); await wp.waitForTimeout(8000); await w.close(); }
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
if (process.env.JS) await p.addInitScript(process.env.JS);
if (process.env.CSS) await p.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }); }, process.env.CSS);
await p.addInitScript(() => {
  // survives client-side navigation: the app is one document
  if (window.__gapWatch) return;
  window.__gapWatch = true;
  window.__gap = 0;
  window.__gapAt = 0;
  let last = performance.now();
  const loop = (t) => {
    const d = t - last;
    if (d > window.__gap) {
      window.__gap = d;
      window.__gapAt = t;
    }
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
console.log('\nhop                                   click->url  ->drawn   worst gap   long tasks in flight');
for (const [from, to, sel] of hops) {
  await p.goto(base + from, { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const link = p.locator(sel).first();
  if (!(await link.count())) {
    console.log((from + ' -> ' + to).padEnd(38), 'no link ' + sel);
    continue;
  }
  if (!(await link.isVisible().catch(() => false))) {
    const menu = p.locator('button[aria-expanded][aria-controls]').first();
    if (await menu.count()) {
      await menu.click();
      await p.waitForTimeout(900);
    }
  }
  await link.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    window.__gap = 0;
    window.__t0 = performance.now();
    window.__long = [];
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    } catch {}
  });
  const t0 = Date.now();
  await link.click({ force: true });
  await p.waitForURL((u) => (to === '/' ? u.pathname === '/' : u.pathname.startsWith(to)), { timeout: 20000 }).catch(() => {});
  const urlAt = Date.now() - t0;
  // drawn: the destination's world layer reports ready, or its first section
  // is on screen — whichever the page has
  const drawnAt = await p
    .waitForFunction(
      () => {
        const w = document.querySelector('[data-world-layer]');
        if (w && w.hasAttribute('data-scene-ready')) return true;
        const s = document.querySelector('main [data-rail]');
        return !!s && s.getBoundingClientRect().height > 100 && !document.documentElement.hasAttribute('data-warping');
      },
      { timeout: 15000 },
    )
    .then(() => Date.now() - t0)
    .catch(() => -1);
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ gap: Math.round(window.__gap), at: Math.round(window.__gapAt - window.__t0), long: window.__long }));
  console.log(
    (from + ' -> ' + to).padEnd(38),
    String(urlAt).padStart(6) + 'ms',
    String(drawnAt).padStart(7) + 'ms',
    String(r.gap).padStart(7) + 'ms @' + r.at + 'ms',
    '  ' + (r.long.length ? r.long.join(', ') + 'ms' : 'none'),
  );
}
await b.close();
