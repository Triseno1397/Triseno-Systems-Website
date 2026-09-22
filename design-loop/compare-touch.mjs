import { chromium, devices } from '@playwright/test';
/* The before/after divider on a phone: does it show, does a thumb move it, and
   does the page still scroll under a thumb that goes up and down? */
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-backgrounding-occluded-windows'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage(); p.setDefaultTimeout(150000);
await p.goto('http://localhost:3300/web-design-division', { waitUntil: 'load' });
await p.waitForTimeout(8000);
const stage = p.locator('.web-compare__stage');
await stage.scrollIntoViewIfNeeded();
await p.waitForTimeout(4500);   // let the opening sweep finish
const read = () => p.evaluate(() => {
  const el = document.querySelector('.web-compare__stage');
  const hint = document.querySelector('.web-compare__hint');
  const cs = hint && getComputedStyle(hint);
  return {
    n: +getComputedStyle(el).getPropertyValue('--n'),
    handleShown: getComputedStyle(document.querySelector('.web-compare__handle')).display,
    hintOpacity: cs ? +cs.opacity : null,
    touchAction: getComputedStyle(el).touchAction,
    scrollY: Math.round(scrollY),
  };
});
console.log('at rest       ', JSON.stringify(await read()));
await p.screenshot({ path: 'design-loop/shots/compare-phone-rest.png' });

// a thumb drags the divider sideways
const box = await stage.boundingBox();
const y = box.y + box.height / 2;
await p.touchscreen.tap(box.x + box.width * 0.6, y);
await p.waitForTimeout(400);
const cdp = await ctx.newCDPSession(p);
const swipe = async (x0, y0, x1, y1) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }] });
    await p.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
await swipe(box.x + box.width * 0.6, y, box.x + box.width * 0.2, y);
await p.waitForTimeout(600);
console.log('after drag L  ', JSON.stringify(await read()));
await p.screenshot({ path: 'design-loop/shots/compare-phone-dragged.png' });

// and the page still scrolls with a vertical swipe that starts on the stage
const before = await p.evaluate(() => Math.round(scrollY));
await swipe(box.x + box.width * 0.5, box.y + box.height * 0.7, box.x + box.width * 0.5, box.y + box.height * 0.1);
await p.waitForTimeout(900);
const after = await p.evaluate(() => Math.round(scrollY));
console.log('vertical swipe on the stage: scrollY', before, '->', after, after > before + 40 ? 'OK page scrolled' : 'BLOCKED');

// the switch takes it all the way over
await p.locator('.web-compare__switch button', { hasText: 'Before' }).click();
await p.waitForTimeout(900);
console.log('switch Before ', JSON.stringify(await read()));
await b.close();
