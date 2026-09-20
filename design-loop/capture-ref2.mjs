import { chromium } from '@playwright/test';
const out = 'design-loop/shots/ref/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://ohzi.io/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(22000); await p.mouse.click(720, 712); await p.waitForTimeout(5000);
await p.mouse.move(280, 582); await p.waitForTimeout(1500); await p.mouse.click(280, 582);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(900); await p.screenshot({ path: out + `06-warp-${i}.png` }); }
await p.waitForTimeout(6000); await p.screenshot({ path: out + '07-world.png' });
for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(3000); await p.screenshot({ path: out + `08-scroll-${i}.png` }); }
await b.close(); console.log('ok');
