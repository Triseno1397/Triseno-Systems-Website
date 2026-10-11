import { chromium } from '@playwright/test';
/* Who touches the DOM while the page sits still? env: PAGE W H */
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const page = process.env.PAGE || '/ai-infrastructure';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__rafCallers = new Map();
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const st = (new Error().stack || '').split('\n').slice(2, 4).map(s => s.trim().replace('http://localhost:3300/_next/static/chunks/', '')).join(' <- ');
    window.__rafCallers.set(st, (window.__rafCallers.get(st) || 0) + 1);
    return orig(cb);
  };
});
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
await p.waitForTimeout(6000);
const r = await p.evaluate(async () => {
  window.__rafCallers.clear();
  const counts = new Map();
  const mo = new MutationObserver(list => {
    for (const m of list) {
      const t = m.target; const el = t.nodeType === 3 ? t.parentElement : t;
      const key = (el ? el.tagName + '.' + String(el.className || '').split(' ').slice(0, 2).join('.') : '?') + (m.type === 'attributes' ? ' @' + m.attributeName : m.type === 'characterData' ? ' text' : ' children');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  mo.observe(document.documentElement, { subtree: true, attributes: true, characterData: true, childList: true });
  await new Promise(r => setTimeout(r, 3000));
  mo.disconnect();
  return { mutations: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16), raf: [...window.__rafCallers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) };
});
console.log('page', page, 'W', W, '(3 s idle)');
console.log('-- DOM mutations'); for (const [k, v] of r.mutations) console.log(String(v).padStart(5), k);
console.log('-- rAF callers'); for (const [k, v] of r.raf) console.log(String(v).padStart(5), k);
await b.close();
