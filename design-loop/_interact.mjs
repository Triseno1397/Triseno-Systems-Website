import { chromium } from '@playwright/test';
import fs from 'node:fs';
/* Video + stills of the interactive moments: hold-to-dive, stack send, slip. */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'design-loop/vid', size: { width: 1440, height: 900 } } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 240)));
const shot = n => p.screenshot({ path: `design-loop/shots/ix-${n}.png` });
await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(5000);
// 1. hold the core
const st = await p.locator('.ai-core__stage').boundingBox();
const cx = st.x + st.width / 2, cy = st.y + st.height / 2;
await p.mouse.move(cx, cy, { steps: 10 }); await p.waitForTimeout(600);
await p.mouse.down();
for (const t of [700, 1400, 2200, 3200]) { await p.waitForTimeout(t === 700 ? 700 : 750); await shot(`dive-${t}`); }
await p.waitForTimeout(2500); await shot('dive-inside');
await p.mouse.move(cx + 120, cy - 60, { steps: 20 }); await p.waitForTimeout(800); await shot('dive-inside2');
await p.mouse.up(); await p.waitForTimeout(2500); await shot('dive-out');
// 2. stack send
const stack = p.locator('[data-rail="Stack"]'); await stack.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
const send = p.getByRole('button', { name: /send request/i }).first();
if (await send.count()) { await send.click(); for (const t of [400, 900, 1500, 2600]) { await p.waitForTimeout(t === 400 ? 400 : 600); await shot(`send-${t}`); } }
const insp = p.getByRole('button', { name: /inspect/i }).first();
if (await insp.count()) { await insp.click(); await p.waitForTimeout(500); const sb = await stack.boundingBox(); await p.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.4, { steps: 10 }); await p.waitForTimeout(900); await shot('inspect'); }
// 3. slip
await p.keyboard.press('Escape');
const rig = p.locator('.ai-chroma').first(); await rig.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
await p.locator('.ai-chroma__card').nth(2).click(); await p.waitForTimeout(6500); await shot('slip');
const path = await p.video().path(); await ctx.close(); await b.close();
fs.renameSync(path, 'design-loop/vid/ai-interact.webm');
console.log('errors', errs.length ? errs.join(' | ') : 'none');
