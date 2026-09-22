import { chromium, devices } from '@playwright/test';

/* Does each component answer a thumb? Tap or swipe it on an iPhone and report
   what changed.  node design-loop/touch-check.mjs */

const base = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'],
});
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
const cdp = await ctx.newCDPSession(p);
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));

const swipe = async (x0, y0, x1, y1) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }],
    });
    await p.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const go = async (route) => {
  await p.goto(base + route, { waitUntil: 'load' });
  await p.waitForTimeout(9000);
};
const show = async (sel) => {
  const l = p.locator(sel).first();
  if (!(await l.count())) return null;
  await l.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(1500);
  return l;
};
const tapOn = async (l) => {
  const bb = await l.boundingBox();
  await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
};
const textOf = (sel) => p.locator(sel).evaluate((el) => el.textContent.replace(/\s+/g, ' ').slice(0, 500));
const row = (page, what, ok, note) => console.log(page.padEnd(20), what.padEnd(28), ok ? 'OK  ' : 'FAIL', note);

// ── studio: swipes ────────────────────────────────────────────────────────
await go('/studio');
for (const [sel, what] of [
  ['.sx-film__viewport', 'formats filmstrip swipe'],
  ['.sx-marquee', 'proof row swipe'],
]) {
  const l = await show(sel);
  if (!l) {
    row('/studio', what, false, 'element missing');
    continue;
  }
  const bb = await l.boundingBox();
  const before = await l.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, sl: el.scrollLeft }));
  await swipe(bb.x + bb.width * 0.8, bb.y + bb.height / 2, bb.x + bb.width * 0.2, bb.y + bb.height / 2);
  await p.waitForTimeout(900);
  const after = await l.evaluate((el) => el.scrollLeft);
  const scrollable = before.sw > before.cw + 40;
  row('/studio', what, scrollable && after > before.sl + 20, 'scrollable ' + scrollable + ' - moved ' + before.sl + ' -> ' + Math.round(after));
}

// ── ai: taps ──────────────────────────────────────────────────────────────
await go('/ai-infrastructure');
{
  const cards = p.locator('[data-rail="Capabilities"] article');
  const l = await show('[data-rail="Capabilities"] article');
  if (l && (await cards.count()) > 2) {
    const target = cards.nth(2);
    await target.scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    await tapOn(target);
    await p.waitForTimeout(900);
    const live = await target.evaluate((el) => el.hasAttribute('data-live'));
    row('/ai-infrastructure', 'tap a capability card', live, live ? 'card went live' : 'no data-live on the tapped card');
  } else row('/ai-infrastructure', 'tap a capability card', false, 'cards missing');

  const nodes = p.locator('[data-rail="Process"] button');
  if ((await show('[data-rail="Process"]')) && (await nodes.count()) > 2) {
    const before = await textOf('[data-rail="Process"]');
    await tapOn(nodes.nth(2));
    await p.waitForTimeout(1800);
    const after = await textOf('[data-rail="Process"]');
    const pressed = await nodes.nth(2).getAttribute('aria-pressed');
    row('/ai-infrastructure', 'tap an orbit step', before !== after || pressed === 'true', pressed !== null ? 'aria-pressed=' + pressed : before !== after ? 'content changed' : 'nothing changed');
  } else row('/ai-infrastructure', 'tap an orbit step', false, 'orbit missing');

  // the options are real radios: ask the tapped one whether it is checked
  // (comparing the first 500 characters of the section's text missed the
  // panel that actually changes, and reported a working toggle as broken)
  const tog = p.locator('.ai-switch__opt').first();
  if ((await show('[data-rail="Why"]')) && (await tog.count())) {
    const before = await tog.getAttribute('aria-checked');
    await tapOn(tog);
    await p.waitForTimeout(900);
    const after = await tog.getAttribute('aria-checked');
    row('/ai-infrastructure', 'tap vendor/triseno toggle', after === 'true', 'aria-checked ' + before + ' -> ' + after);
  } else row('/ai-infrastructure', 'tap vendor/triseno toggle', false, 'toggle missing');

  const tabs = p.locator('[data-rail="Industries"] button');
  if ((await show('[data-rail="Industries"]')) && (await tabs.count()) > 1) {
    const before = await textOf('[data-rail="Industries"]');
    await tapOn(tabs.nth(1));
    await p.waitForTimeout(1200);
    const after = await textOf('[data-rail="Industries"]');
    row('/ai-infrastructure', 'tap an industry', before !== after, before !== after ? 'content changed' : 'nothing changed');
  } else row('/ai-infrastructure', 'tap an industry', false, 'buttons: ' + (await tabs.count()));
}

// ── work: expand a row ────────────────────────────────────────────────────
await go('/work');
{
  const rows = p.locator('[data-rail="Index"] [aria-expanded]');
  if ((await show('[data-rail="Index"]')) && (await rows.count()) > 1) {
    const r = rows.nth(1);
    await r.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await tapOn(r);
    await p.waitForTimeout(900);
    const state = await r.getAttribute('aria-expanded');
    row('/work', 'tap a row to expand', state === 'true', 'aria-expanded=' + state);
  } else row('/work', 'tap a row to expand', false, 'expandable rows: ' + (await rows.count()));
}

// ── the menu ──────────────────────────────────────────────────────────────
{
  const t = p.locator('button[aria-expanded][aria-controls], button[aria-label*="enu" i]').first();
  if (await t.count()) {
    await tapOn(t);
    await p.waitForTimeout(900);
    const open = (await t.getAttribute('aria-expanded')) === 'true';
    const links = await p.locator('[role="dialog"] a, [class*="overlay"] a').count();
    row('/work', 'tap the menu', open || links > 3, 'aria-expanded=' + (await t.getAttribute('aria-expanded')) + ' - links ' + links);
    await tapOn(t);
    await p.waitForTimeout(600);
  } else row('/work', 'tap the menu', false, 'trigger missing');
}

// ── portal: the phone robot ───────────────────────────────────────────────
await go('/');
{
  const l = await show('.portal-robot');
  if (l) {
    await p.waitForTimeout(5000);
    const ready = (await l.getAttribute('data-ready')) !== null;
    await tapOn(l);
    await p.waitForTimeout(400);
    row('/', 'phone robot stage', ready, ready ? 'ready, tapped' : 'not ready');
  } else row('/', 'phone robot stage', false, 'missing');
}

console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
