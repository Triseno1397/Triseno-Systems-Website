import { chromium } from '@playwright/test';
const [route, sel, out] = process.argv.slice(2);
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto((process.env.BASE || 'http://localhost:3300') + route, { waitUntil: 'load' }); await p.waitForTimeout(4000);
const y = await p.evaluate(s => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
await p.evaluate(y => scrollTo(0, y), y + Number(process.env.OFF || 0)); await p.waitForTimeout(3500);
await p.screenshot({ path: out }); await b.close();
