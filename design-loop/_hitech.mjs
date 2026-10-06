import { chromium } from '@playwright/test';
/* Stack film (idle + layer open) and the console rig, desktop and phone. */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
for (const [tag, W, H] of [['d', 1440, 900], ['m', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: tag === 'm' ? 2 : 1, isMobile: tag === 'm', hasTouch: tag === 'm' });
  p.on('pageerror', e => errs.push(tag + ': ' + String(e).slice(0, 200)));
  await p.goto('http://localhost:3300/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  const st = p.locator('.ai-sf__stage');
  await st.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  await p.screenshot({ path: `design-loop/shots/sf-${tag}.png` });
  await p.locator('.ai-sf__tag').nth(2).click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `design-loop/shots/sf-${tag}-open.png` });
  const rig = p.locator('.ai-rig');
  await rig.scrollIntoViewIfNeeded(); await p.waitForTimeout(3000);
  await p.screenshot({ path: `design-loop/shots/rig-${tag}.png` });
  console.log(tag, await p.evaluate(() => [...document.querySelectorAll('.ai-sf__film, .ai-rig__film')].map(v => v.paused ? 'paused' : 'playing').join(',')));
  await p.close();
}
console.log('errors', errs.length ? errs.join(' | ') : 'none');
await b.close();
