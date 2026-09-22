import { chromium, devices } from '@playwright/test';

/* Scroll one section with a bit of CSS applied, and compare.
   node design-loop/css-ab.mjs <url> <startY> "<css A>" "<css B>" ...
   The first variant always runs twice and its first run is thrown away: a cold
   first pass reads ~2x slow and has fooled this loop before. */

const url = process.argv[2];
const from = Number(process.argv[3] || 0);
const variants = process.argv.slice(4);
const steps = Number(process.env.STEPS || 70);
const phone = process.env.PHONE === '1';

const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});

async function run(css) {
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(150000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  if (phone) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(phone ? 9000 : 7000);
  if (css) await p.addStyleTag({ content: css });
  // walk the page first when asked (WALK=y1,y2,...): reaching a section by
  // scrolling is not the same as jumping to it — everything above it has
  // loaded, mounted and started by then
  for (const y of (process.env.WALK || '').split(',').filter(Boolean)) {
    await p.evaluate((v) => window.scrollTo(0, v), Number(y));
    await p.waitForTimeout(2000);
  }
  await p.evaluate((y) => window.scrollTo(0, y), from);
  await p.waitForTimeout(1500);
  if (!phone) await p.mouse.move(720, 450);
  await p.evaluate(() => {
    window.__f = [];
    let last = performance.now();
    const loop = (t) => {
      window.__f.push(t - last);
      last = t;
      window.__raf = requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const t0 = Date.now();
  for (let i = 0; i < steps; i++) {
    if (phone) await p.evaluate(() => window.scrollBy(0, 100));
    else {
      await p.mouse.wheel(0, 100);
      // the measuring rig moves the pointer while it scrolls, and so does a
      // visitor: hover work is part of the cost
      if (i % 3 === 0 && !process.env.NOMOUSE) await p.mouse.move(300 + (i * 700) % 900, 250 + (i * 300) % 400);
    }
    await p.waitForTimeout(45);
  }
  const secs = (Date.now() - t0) / 1000;
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const f = (await p.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__f.slice(3);
  })).filter((x) => x > 0);
  await ctx.close();
  const so = [...f].sort((a, c) => a - c);
  const d = (k) => Math.round(((m1[k] - m0[k]) / secs) * 1000);
  return {
    fps: +(1000 / (f.reduce((a, c) => a + c, 0) / f.length)).toFixed(0),
    p95: +so[Math.floor(so.length * 0.95)].toFixed(0),
    jank: +((100 * f.filter((x) => x > 33).length) / f.length).toFixed(1),
    script: d('ScriptDuration'),
    style: d('RecalcStyleDuration'),
    layout: d('LayoutDuration'),
  };
}

const rows = [];
// cold pass, thrown away
await run(variants[0] || '');
for (const css of variants.length ? variants : ['']) {
  rows.push({ variant: css ? css.slice(0, 54) : '(as built)', ...(await run(css)) });
}
console.log('\n' + url + '  from y=' + from + (phone ? '  [phone, 4x throttle]' : ''));
console.table(rows);
await b.close();
