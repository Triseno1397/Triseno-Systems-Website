import { chromium } from '@playwright/test';
/* Industries grid (rest + spotlight) and the stack viewer. */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(4000);
const stack = p.locator('[data-rail="Stack"]');
await stack.scrollIntoViewIfNeeded(); await p.waitForTimeout(3500);
await p.screenshot({ path: 'design-loop/shots/stack-glass.png' });
const grid = p.locator('.ai-chroma').first();
await grid.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
const bx = await grid.boundingBox();
await p.mouse.move(bx.x + bx.width * 0.75, bx.y + bx.height * 0.3, { steps: 10 }); await p.waitForTimeout(1200);
await p.screenshot({ path: 'design-loop/shots/ind-new.png' });
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
