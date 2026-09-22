import { chromium, devices } from '@playwright/test';

/* Where things actually sit on a phone: the portal hero, the Operator's stage
   and the first door; the demo's tail against the compare section; and the
   Why toggle answered by its own aria-checked.  node design-loop/phone-measure.mjs */

const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'],
});
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);

const boxes = (pairs) =>
  p.evaluate((pairs) => {
    const out = {};
    for (const [label, sel] of pairs) {
      const el = document.querySelector(sel);
      if (!el) {
        out[label] = 'missing';
        continue;
      }
      const r = el.getBoundingClientRect();
      out[label] = { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), h: Math.round(r.height), w: Math.round(r.width) };
    }
    out.viewport = innerHeight;
    out.page = document.documentElement.scrollHeight;
    return out;
  }, pairs);

await p.goto(base + '/', { waitUntil: 'load' });
await p.waitForTimeout(10000);
await p.evaluate(() => window.scrollTo(0, 400));
await p.waitForTimeout(2500);
console.log('PORTAL', JSON.stringify(await boxes([
  ['hero', '[data-rail="Divisions"]'],
  ['list', '[data-rail="Divisions"] nav, [data-rail="Divisions"] ul, [data-rail="Divisions"] ol'],
  ['robotStage', '.portal-robot'],
  ['robotCanvas', '.portal-robot canvas'],
  ['doorsSection', '[data-rail="Three divisions"]'],
  ['firstDoorCard', '[data-rail="Three divisions"] .glass-panel'],
]), null, 0));

await p.goto(base + '/web-design-division', { waitUntil: 'load' });
await p.waitForTimeout(9000);
await p.evaluate(() => window.scrollTo(0, 2400));
await p.waitForTimeout(2500);
console.log('WEB', JSON.stringify(await boxes([
  ['demo', '.web-demo'],
  ['demoStage', '.web-demo__stage'],
  ['demoViewport', '.web-demo__viewport'],
  ['compare', '[data-rail="Before / After"]'],
  ['compareHead', '[data-rail="Before / After"] header'],
  ['compareStage', '.web-compare__stage'],
]), null, 0));

await p.goto(base + '/ai-infrastructure', { waitUntil: 'load' });
await p.waitForTimeout(9000);
const vendor = p.locator('.ai-switch__opt').first();
await vendor.scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
const before = await vendor.getAttribute('aria-checked');
const bb = await vendor.boundingBox();
await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.waitForTimeout(800);
const after = await vendor.getAttribute('aria-checked');
console.log('WHY toggle: vendor aria-checked', before, '->', after, after === 'true' ? '(tap works)' : '(tap did nothing)');

await b.close();
