import { chromium } from '@playwright/test';

/* One screenshot of one page at one size, full height.
   node design-loop/shot.mjs /contact 1440 out.png [fullPage=1] */

const base = process.env.BASE || 'http://localhost:3300';
const path = process.argv[2] || '/';
const W = Number(process.argv[3] || 1440);
const out = process.argv[4] || 'design-loop/shots/shot.png';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding'] });
const p = await b.newPage({ viewport: { width: W, height: Number(process.env.H || 1000) } });
await p.goto(base + path, { waitUntil: 'load' });
await p.waitForTimeout(Number(process.env.WAIT || 5000));
await p.screenshot({ path: out, fullPage: process.env.FULL !== '0' });
await b.close();
console.log(out);
