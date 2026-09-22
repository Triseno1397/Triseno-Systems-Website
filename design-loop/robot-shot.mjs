import { chromium } from '@playwright/test';
import http from 'http'; import fs from 'fs'; import path from 'path';
const srv = http.createServer((q, s) => { const f = path.join(process.cwd(), decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'model/gltf-binary' }); fs.createReadStream(f).pipe(s); }).listen(4412);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); p.on('console', m => console.log('console:', m.type(), m.text().slice(0, 200))); p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
for (const f of process.argv.slice(2)) {
  await p.goto('http://localhost:4412/' + (process.env.PAGE || 'preview.html') + '?f=' + f); await p.waitForFunction(() => window.__done, null, { timeout: 60000 });
  console.log(f, await p.evaluate(() => window.__done)); const d = await p.evaluate(() => window.__img); fs.writeFileSync('view-' + f.replace('.glb', '') + '.png', Buffer.from(d.split(',')[1], 'base64'));
}
await b.close(); srv.close();
