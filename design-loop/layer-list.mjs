import { chromium, devices } from '@playwright/test';
const [url, y] = [process.argv[2], +(process.argv[3] || 0)];
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('DOM.getDocument', { depth: -1 }); await cdp.send('LayerTree.enable');
let layers = []; cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; });
await p.goto(url, { waitUntil: 'load' }); if (process.env.CSS) await p.addStyleTag({ content: process.env.CSS }); await p.waitForTimeout(5000); await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(1500);
await cdp.send('DOM.getDocument', { depth: -1 });
const agg = {};
for (const l of layers.filter(l => l.drawsContent)) {
  let name = '(no node)';
  if (l.backendNodeId) { try { const d = await cdp.send('DOM.describeNode', { backendNodeId: l.backendNodeId }); const n = d.node; const cls = (n.attributes || []).reduce((a, v, i, arr) => arr[i - 1] === 'class' ? v : a, ''); name = n.nodeName.toLowerCase() + '.' + cls.split(' ')[0]; } catch {} }
  const mb = Math.min(l.width, 1200) * Math.min(l.height, 2532) * 9 * 4 / 1e6;
  agg[name] = agg[name] || { n: 0, mb: 0, size: '' }; agg[name].n++; agg[name].mb += mb; agg[name].size = Math.round(l.width) + 'x' + Math.round(l.height);
}
Object.entries(agg).sort((a, b) => b[1].mb - a[1].mb).slice(0, 18).forEach(([k, v]) => console.log(v.mb.toFixed(0).padStart(5), 'MB', String(v.n).padStart(3), 'x', v.size.padEnd(11), k));
await b.close();
