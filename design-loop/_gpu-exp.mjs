import { chromium } from '@playwright/test';
/* What does each layer of the page cost? One scroll of the page per
   experiment, with a stylesheet injected that switches one feature off
   (EXPS below, or env INJECT_CSS for a single one). Reports, per run: frame
   times from rAF, the renderer main thread's busy time, and the GPU
   process's busy time — the GPU number is the one that predicts a weak
   laptop, which no CPU throttle shows. env PORT PAGE W H CPU ONLY */
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
const page = process.env.PAGE || '/web-design-division';
const cpu = +(process.env.CPU || 1); const phone = W < 768;
const EXPS = {
  baseline: '',
  'no-blend-layers': '.web-scene__haze,.world-plate__spill,.world-plate__shaft,.web-plate__shaft,.world-plate__light,.world-plate__tint,.sx-scene__haze,.portal-haze{display:none!important}',
  'no-glass-copies': '.glass-panel__world{display:none!important}',
  'no-content-mask': 'main>[data-fade]{mask-image:none!important;-webkit-mask-image:none!important;animation:none!important}',
  'no-canvas': 'canvas{visibility:hidden!important}',
  'no-filters': '*{filter:none!important}',
  'no-css-anim': '*,*::before,*::after{animation-play-state:paused!important}',
  'no-backdrop': '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  'one-station': '.world-plate__station:not(:first-child){display:none!important}',
  'no-will-change': '*{will-change:auto!important}',
  // one light layer at a time
  'no-haze': '.web-scene__haze{display:none!important}',
  'no-spill': '.world-plate__spill{display:none!important}',
  'no-shafts': '.world-plate__shaft,.web-plate__shaft{display:none!important}',
  'no-pointer-light': '.world-plate__light{display:none!important}',
  'no-tint': '.world-plate__tint{display:none!important}',
  'no-fx-wrap': '.web-plate__fx{display:none!important}',
  'no-dust': '.world-plate__dust,.world-plate__haze{display:none!important}',
  // the content fade, three ways
  'narrow-mask': 'main>[data-fade]{-webkit-mask-size:100% var(--fade-vh,100vh)!important;mask-size:100% var(--fade-vh,100vh)!important}@keyframes content-fade-track{from{-webkit-mask-position:0 calc(0% - var(--fade-vh,100vh));mask-position:0 calc(0% - var(--fade-vh,100vh))}to{-webkit-mask-position:0 calc(100% + var(--fade-vh,100vh));mask-position:0 calc(100% + var(--fade-vh,100vh))}}',
  'fade-no-wc': 'main>[data-fade]{will-change:auto!important}',
  'scrims': 'main>[data-fade]{-webkit-mask-image:none!important;mask-image:none!important;animation:none!important;will-change:auto!important}html[data-content-fade] body::before,html[data-content-fade] body::after{content:"";position:fixed;left:0;right:0;z-index:790;pointer-events:none}html[data-content-fade] body::before{top:0;height:150px;background:linear-gradient(180deg,#000 0%,rgba(0,0,0,.9) 36%,rgba(0,0,0,.55) 62%,rgba(0,0,0,.2) 84%,rgba(0,0,0,0) 100%)}html[data-content-fade] body::after{bottom:0;height:120px;background:linear-gradient(0deg,#000 0%,rgba(0,0,0,.85) 34%,rgba(0,0,0,.5) 60%,rgba(0,0,0,.18) 84%,rgba(0,0,0,0) 100%)}',
};
const only = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(EXPS);
if (process.env.INJECT_CSS) { EXPS.custom = process.env.INJECT_CSS; only.push('custom'); }
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(1); };
console.log(`${page} ${W}x${H} cpu${cpu}`);
console.log('experiment          p50    p95   >33   main-busy  gpu-busy  layerize+commit  paint+prepaint  style');
for (const name of only) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await p.addInitScript(() => { window.__f = []; let last = performance.now(); const t = (n) => { window.__f.push(n - last); last = n; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await p.goto('http://localhost:' + (process.env.PORT || 3403) + page + '?explore=off', { waitUntil: 'load' });
  if (EXPS[name]) await p.addStyleTag({ content: EXPS[name] });
  await p.waitForTimeout(3500);
  const events = [];
  cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await p.evaluate(() => { window.__f.length = 0; });
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0; i < Math.ceil(total / 110); i++) { await p.mouse.wheel(0, 110); await p.waitForTimeout(16); }
  await p.waitForTimeout(400);
  const frames = await p.evaluate(() => window.__f.slice(3));
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  await ctx.close();
  let main = null; const gpuThreads = new Set();
  for (const e of events) {
    if (e.name === 'thread_name' && e.args?.name === 'CrRendererMain') main = `${e.pid}:${e.tid}`;
    if (e.name === 'process_name' && /GPU/i.test(e.args?.name || '')) gpuThreads.add(String(e.pid));
  }
  let mainBusy = 0, gpuBusy = 0, lc = 0, pp = 0, st = 0;
  for (const e of events) {
    if (e.ph !== 'X' || !e.dur) continue;
    const k = `${e.pid}:${e.tid}`;
    if (k === main && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask')) mainBusy += e.dur;
    if (k === main && (e.name === 'Layerize' || e.name === 'Commit')) lc += e.dur;
    if (k === main && (e.name === 'Paint' || e.name === 'PrePaint')) pp += e.dur;
    if (k === main && e.name === 'UpdateLayoutTree') st += e.dur;
    if (gpuThreads.has(String(e.pid)) && e.name === 'GPUTask') gpuBusy += e.dur;
  }
  const ms = (v) => String(Math.round(v / 1000)).padStart(6);
  console.log(`${name.padEnd(18)} ${String(q(frames, .5)).padStart(5)} ${String(q(frames, .95)).padStart(6)} ${String(frames.filter((x) => x > 33).length).padStart(5)} ${ms(mainBusy)} ms ${ms(gpuBusy)} ms ${ms(lc)} ms ${ms(pp)} ms ${ms(st)} ms`);
}
await b.close();
