import { chromium } from '@playwright/test';
/* The museum section over time: arrival, lights, the camera going in, the
   line drawing, then a pick (Trades, which halts on the slip). W H TAG */
const W = +(process.env.W || 1440), H = +(process.env.H || 900), tag = process.env.TAG || 'mus-d';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(3500);
// bring the section in: the stage's top a little under the chrome
await p.evaluate(() => { const el = document.querySelector('.ai-mus__stage'); const r = el.getBoundingClientRect(); const lane = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lane-top')) || 80; window.scrollTo(0, scrollY + r.top - lane); });
const shot = async (name, wait) => { await p.waitForTimeout(wait); await p.screenshot({ path: `design-loop/shots/${tag}-${name}.png` }); };
await shot('0-dark', 250);
await shot('1-lights', 1100);
await shot('2-in', 1900);
await shot('3-line', 2600);
await shot('4-done', 4200);
// pick Trades & Industrial from the room list
await p.evaluate(() => document.querySelectorAll('.ai-mus__roombtn')[2]?.click());
await shot('5-travel', 500);
await shot('6-trades', 1900);
await shot('7-halt', 4600);
if (phone) { await p.evaluate(() => document.querySelector('.ai-mus__label')?.scrollIntoView({ block: 'center' })); await shot('8-label', 600); }
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
