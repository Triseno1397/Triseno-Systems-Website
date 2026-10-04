import { chromium } from '@playwright/test';
/* One screenshot per AI page section (data-rail), live or local. BASE= */
const BASE = process.env.BASE || 'https://trisenosystems.com';
const b = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + '/ai-infrastructure', { waitUntil: 'load' }); await p.waitForTimeout(5000);
const n = await p.locator('[data-rail]').count();
for (let i = 0; i < n; i++) {
  const el = p.locator('[data-rail]').nth(i);
  const name = await el.getAttribute('data-rail');
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
  await p.screenshot({ path: `design-loop/shots/tour-${i}-${name.replace(/\W+/g, '')}.png` });
  console.log(i, name);
}
await b.close();
