import { chromium, devices } from '@playwright/test';
const base = process.env.BASE || 'https://trisenosystems.com';
const routes = (process.env.ROUTES || '/,/studio,/web-design-division,/ai-infrastructure,/work,/contact').split(',');
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
for (const r of routes) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('LayerTree.enable');
  let layers = []; cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; });
  await p.goto(base + r, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const dpr = 3; let peak = 0, peakN = 0, peakY = 0;
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let imgPeak = 0;
  for (let y = 0; y < H; y += 700) {
    await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(700);
    const drawn = layers.filter(l => l.drawsContent);
    // a tiled layer only keeps tiles near the viewport: cap each layer's height at ~3 viewports
    const bytes = drawn.reduce((s, l) => s + Math.min(l.width, 1200) * Math.min(l.height, 844 * 3) * dpr * dpr * 4, 0);
    if (bytes > peak) { peak = bytes; peakN = drawn.length; peakY = y; }
    const img = await p.evaluate(() => { let s = 0; const seen = new Set();
      for (const im of document.images) if (im.complete && im.naturalWidth && !seen.has(im.currentSrc)) { seen.add(im.currentSrc); s += im.naturalWidth * im.naturalHeight * 4; }
      return s; });
    imgPeak = Math.max(imgPeak, img);
  }
  console.log(r.padEnd(22), 'peak layer MB ~', (peak / 1e6).toFixed(0), 'layers', peakN, '@y', peakY, '| decoded <img> MB ~', (imgPeak / 1e6).toFixed(0));
  await ctx.close();
}
await b.close();
