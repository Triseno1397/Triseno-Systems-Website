import { chromium } from '@playwright/test';

/* Who owns the main thread from navigation to the world being drawn: a CPU
   profile started before the page loads, aggregated by self time. Run against
   the dev server so the names are real.
   node design-loop/startup-cpu.mjs http://localhost:3200/ [seconds] */

const url = process.argv[2] || 'http://localhost:3200/';
const secs = Number(process.argv[3] || 8);
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
// CLICK=<selector>: load first, settle, then profile the hop that link makes
const click = process.env.CLICK;
if (click) {
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(9000);
  await cdp.send('Profiler.start');
  await p.locator(click).first().click({ force: true });
} else if (process.env.DELAY) {
  // DELAY=ms: load, settle that long, then profile the steady state
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(Number(process.env.DELAY));
  await cdp.send('Profiler.start');
} else {
  await cdp.send('Profiler.start');
  await p.goto(url, { waitUntil: 'commit' });
}
await p.waitForTimeout(secs * 1000);
const { profile } = await cdp.send('Profiler.stop');
await b.close();

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map();
const total = profile.samples.length;
// self time, and the nearest named ancestor from our own code for native leaves
const ours = (id) => {
  let cur = id;
  for (let i = 0; i < 40 && cur !== undefined; i++) {
    const n = byId.get(cur);
    const f = n.callFrame;
    if (f.url && /\/src\/|_0|src_/.test(f.url) && f.functionName) return f.functionName;
    cur = parent.get(cur);
  }
  return '';
};
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame;
  const file = (f.url || '').split('/').pop().split('?')[0];
  let key = (f.functionName || '(anon)') + '  ' + file + (f.lineNumber >= 0 ? ':' + (f.lineNumber + 1) : '');
  if (!f.url) {
    const via = ours(id);
    key = (f.functionName || '(anon)') + (via ? '   <- ' + via : '');
  }
  self.set(key, (self.get(key) || 0) + 1);
}
const ms = (profile.endTime - profile.startTime) / 1000;
console.log('\n' + url + '  -  first ' + secs + 's, ' + total + ' samples over ' + ms.toFixed(0) + 'ms\n');
console.log('self time by function (% of samples):');
for (const [k, v] of [...self.entries()].sort((a, c) => c[1] - a[1]).slice(0, 30)) {
  console.log('  ', ((v / total) * 100).toFixed(1).padStart(5) + '%', k);
}
