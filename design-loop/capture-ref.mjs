import { chromium } from '@playwright/test';
const out = 'design-loop/shots/ref/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://ohzi.io/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500); await p.screenshot({ path: out + '01-loader.png' });
await p.waitForTimeout(20000); await p.screenshot({ path: out + '02-hero.png' });
await p.mouse.click(720, 712);
await p.waitForTimeout(3500); await p.screenshot({ path: out + '03-menu.png' });
for (const [i, w] of [['04','HOW WE DO IT'],['05','OUR WORK']]) {
  await p.getByText(w, { exact: true }).first().hover().catch(()=>{});
  await p.waitForTimeout(1800); await p.screenshot({ path: out + i + '-menu-hover.png' });
}
await p.getByText('WHO WE ARE', { exact: true }).first().click().catch(()=>{});
for (let i = 0; i < 4; i++) { await p.waitForTimeout(700); await p.screenshot({ path: out + `06-warp-${i}.png` }); }
await p.waitForTimeout(4000); await p.screenshot({ path: out + '07-world.png' });
for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(2200); await p.screenshot({ path: out + `08-scroll-${i}.png` }); }
await b.close(); console.log('ok');
