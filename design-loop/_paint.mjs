import { chromium } from '@playwright/test';
/* First paint in a real browser: FCP, LCP (with the element), long tasks
   before LCP, under CPU + network throttling. env: PAGE W H CPU NET=slow4g|fast3g|none INJECT_CSS */
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 4);
const net = process.env.NET || 'slow4g';
const phone = W < 768;
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await cdp.send('Network.enable');
const profiles = { slow4g: { latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 }, fast3g: { latency: 562, down: 1.6e6 / 8, up: 750e3 / 8 }, none: null };
if (profiles[net]) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profiles[net].latency, downloadThroughput: profiles[net].down, uploadThroughput: profiles[net].up });
await p.addInitScript(() => {
  window.__paint = { lcp: [], long: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__paint.lcp.push({ t: Math.round(e.startTime), size: e.size, el: e.element ? (e.element.tagName + '.' + String(e.element.className).split(' ').slice(0, 2).join('.')) : '?', url: (e.url || '').split('/').pop() }); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__paint.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
});
if (process.env.INJECT_CSS) await p.addStyleTag({ content: process.env.INJECT_CSS }).catch(() => {});
const t0 = Date.now();
await p.goto('http://localhost:3300' + page, { waitUntil: 'load' });
if (process.env.INJECT_CSS) await p.addStyleTag({ content: process.env.INJECT_CSS });
await p.waitForTimeout(9000);
const r = await p.evaluate(() => {
  const paints = performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)]);
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const byType = {};
  for (const e of res) { const k = e.initiatorType; byType[k] = (byType[k] || 0) + (e.transferSize || 0); }
  const fonts = res.filter(e => /\.woff2/.test(e.name)).map(e => [e.name.split('/').pop().slice(0, 18), Math.round(e.responseEnd)]);
  const css = res.filter(e => /\.css/.test(e.name)).map(e => [e.name.split('/').pop(), Math.round(e.responseEnd)]);
  const js = res.filter(e => /\.js/.test(e.name)).sort((a, b) => a.responseEnd - b.responseEnd).map(e => [e.name.split('/').pop().slice(0, 16), Math.round(e.responseEnd), Math.round((e.transferSize || 0) / 1024)]);
  const long = window.__paint.long; const lcp = window.__paint.lcp;
  const lcpT = lcp.length ? lcp[lcp.length - 1].t : 0;
  const tbt = long.filter(([s]) => s < Math.max(lcpT, 5000)).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  return { paints, domInteractive: Math.round(nav.domInteractive), domComplete: Math.round(nav.domComplete), lcp, longBeforeLcp: long.filter(([s]) => s < lcpT).length, tbtTo5s: tbt, fonts, css, jsFirst8: js.slice(0, 8), kb: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])) };
});
console.log(JSON.stringify({ page, W, cpu, net, ...r }, null, 1));
await b.close();
