import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3300/studio', { waitUntil: 'load' }); await p.waitForTimeout(5000);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(3000); const btn = p.locator('.ghost-btn').last();
const bb = await btn.boundingBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
await p.mouse.move(cx - 200, cy); await p.mouse.move(cx, cy, { steps: 8 }); await p.waitForTimeout(700);
const orb = await p.locator('.orb-cursor').boundingBox();
console.log('under:', await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e?e.tagName+'.'+e.className+' | closest a/button: '+(e.closest('a,button')?.className||'none'):'null'},[cx,cy]));
console.log('pointer', cx.toFixed(0), cy.toFixed(0), '| orb centre', (orb.x + orb.width / 2).toFixed(0), (orb.y + orb.height / 2).toFixed(0), '| hot', await p.locator('.orb-cursor').getAttribute('data-hot'));
await p.screenshot({ path: 'design-loop/shots/cursor-hover.png', clip: { x: cx - 220, y: cy - 90, width: 440, height: 180 } });
// scroll with a still mouse: does hover state follow the page?
await p.mouse.wheel(0, -1400); await p.waitForTimeout(1800);
console.log('after scroll hot =', await p.locator('.orb-cursor').getAttribute('data-hot'), '| el under pointer:', await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a,button')?.textContent?.trim().slice(0, 30) ?? 'none', [cx, cy]));
await b.close();
