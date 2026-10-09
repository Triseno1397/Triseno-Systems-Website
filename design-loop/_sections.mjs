import { chromium } from '@playwright/test';
/* Screenshot named sections of the AI page once settled. W/H/TAG env. */
const W = +(process.env.W || 1440), H = +(process.env.H || 900), tag = process.env.TAG || 'd';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4500);
await p.screenshot({ path: `design-loop/shots/sec-${tag}-hero.png` });
for (const [name, sel, off] of [['builtby', '#ai-built-title', 0.18], ['industries', '#ai-console', 0.3], ['why', '#ai-why-title', 0.12]]) {
  await p.evaluate(([s, o]) => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - innerHeight * o); }, [sel, off]);
  await p.waitForTimeout(3800);
  await p.screenshot({ path: `design-loop/shots/sec-${tag}-${name}.png` });
}
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
