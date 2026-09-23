import { chromium } from '@playwright/test';

/* Reads the Operator's own per-frame trace of a move (?opmotion=1) and prints
   it as a strip: how much the chest turned, how far the sword hand travelled,
   whether the blade and its trail were up, and the clip's weight.
   node design-loop/move-trace.mjs [clicks] */

const base = process.env.BASE || 'http://localhost:3300';
const clicks = Number(process.argv[2] || 1);
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(150000);
await p.goto(base + '/?opmotion=1', { waitUntil: 'load' });
await p.waitForTimeout(12000);

for (let c = 0; c < clicks; c++) {
  await p.evaluate(() => { window.__motion.length = 0; });
  await p.mouse.click(Math.round(1440 * 0.8), Math.round(900 * 0.62));
  await p.waitForTimeout(11000);
  const rows = await p.evaluate(() => window.__motion);
  const move = rows.filter((r) => r[0] >= 0);
  if (!move.length) {
    console.log('click', c + 1, '- no move recorded');
    continue;
  }
  // bucket by tenth of a second
  const bins = new Map();
  for (const [t, turn, hand, body, trail, w, dt, ct] of move) {
    const k = Math.floor(t * 10) / 10;
    const e = bins.get(k) || { turn: 0, hand: 0, n: 0, body: 0, trail: 0, w: 0, dtMin: 9, dtMax: 0, ct0: 99, ct1: -1 };
    e.turn += turn; e.hand += hand; e.n++; e.body += body; e.trail += trail; e.w = Math.max(e.w, w);
    e.dtMin = Math.min(e.dtMin, dt); e.dtMax = Math.max(e.dtMax, dt); e.ct0 = Math.min(e.ct0, ct); e.ct1 = Math.max(e.ct1, ct);
    bins.set(k, e);
  }
  const keys = [...bins.keys()].sort((a, z) => a - z);
  console.log('\nclick ' + (c + 1) + ' - ' + move.length + ' frames, move ran ' + keys[keys.length - 1].toFixed(1) + 's');
  console.log('   t    chest turn/frame  hand mm/frame   blade trail  weight   n   dt ms      clip s');
  for (const k of keys) {
    const e = bins.get(k);
    const turn = e.turn / e.n, hand = e.hand / e.n;
    const bar = '#'.repeat(Math.min(28, Math.round(hand / 1.5)));
    console.log(
      '  ' + k.toFixed(1).padStart(4),
      turn.toFixed(2).padStart(8),
      hand.toFixed(2).padStart(12),
      '   ' + (e.body === e.n ? 'on ' : e.body === 0 ? 'off' : 'FLICKER'),
      (e.trail === e.n ? 'on ' : e.trail === 0 ? 'off' : 'FLICKER'),
      e.w.toFixed(2).padStart(6),
      String(e.n).padStart(4),
      (' ' + (e.dtMin * 1000).toFixed(0) + '-' + (e.dtMax * 1000).toFixed(0)).padStart(9),
      (' ' + e.ct0.toFixed(2) + '-' + e.ct1.toFixed(2)).padStart(12),
      ' ' + bar,
    );
  }
  if (process.env.RAW) {
    const [a, z] = process.env.RAW.split(",").map(Number);
    console.log("  raw frames " + a + "-" + z + "s:   t     hand/frame   clip    hand.y   hips.y  shoulder.y  arm.qx  hand.qx");
    for (const r of move) if (r[0] >= a && r[0] <= z) console.log("   ", r[0].toFixed(3), String(r[2]).padStart(9), r[7].toFixed(3).padStart(7), r[9].toFixed(3).padStart(8), r[11].toFixed(3).padStart(8), r[12].toFixed(3).padStart(10), r[13].toFixed(3).padStart(8), r[14].toFixed(3).padStart(8));
  }
  // the tail: where does the hand stop travelling?
  let quietFrom = null;
  for (let i = keys.length - 1; i >= 0; i--) {
    const e = bins.get(keys[i]);
    if (e.hand / e.n > 2) break;
    quietFrom = keys[i];
  }
  console.log('  tail: hand under 2mm/frame from ' + (quietFrom === null ? '(never)' : quietFrom.toFixed(1) + 's') + ' to the end');
}
await b.close();
