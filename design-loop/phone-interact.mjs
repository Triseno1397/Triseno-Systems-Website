import { chromium, devices } from '@playwright/test';
import fs from 'fs';
const base = process.env.BASE || 'https://trisenosystems.com';
const out = 'design-loop/shots/phone/interact/'; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); p.setDefaultTimeout(60000);
const log = []; const L = s => { log.push(s); console.log(s); };
// block real form sends
let payload = null;
await p.route('**/api.web3forms.com/**', async r => { payload = r.request().postData(); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"message":"ok"}' }); });
// 4 contact flow
await p.goto(base + '/contact'); await p.waitForTimeout(6000);
await p.screenshot({ path: out + '10-contact.png' });
let step = 0;
const answers = { name: 'Test Person', email: 'test@example.com', phone: '5550100', company: 'Example Co', current_site: 'example.com', message: 'Phone audit test — not a real inquiry.' };
for (let i = 0; i < 14; i++) {
  const txt = await p.locator('form').innerText().catch(() => '');
  if (/thank|received|sent|we.ll be in touch|got it/i.test(txt) && !(await p.locator('form input:visible, form textarea:visible').count())) break;
  const radios = p.locator('form [role=radio]:visible, form input[type=radio]:visible, form [role=option]:visible');
  const field = p.locator('form input:not([type=radio]):not([type=hidden]):not([name=botcheck]):visible, form textarea:visible, form select:visible').first();
  if (await radios.count()) { await radios.first().tap(); }
  else if (await field.count()) { const nm = (await field.getAttribute('name')) || (await field.getAttribute('type')) || (await field.getAttribute('id')) || ''; const tag = await field.evaluate(e => e.tagName); const typ = await field.getAttribute('type');
    if (tag === 'SELECT') await field.selectOption({ index: 1 }); else await field.fill(typ === 'email' || /mail/i.test(nm) ? 'test@example.com' : typ === 'tel' ? '5550100' : typ === 'url' ? 'example.com' : (answers[nm] ?? 'Phone audit test, not a real inquiry'));
    L('filled ' + nm); }
  await p.waitForTimeout(600);
  await p.screenshot({ path: out + `11-step-${String(++step).padStart(2, '0')}.png` });
  const next = p.getByRole('button', { name: /next|send|submit|continue/i }).filter({ visible: true }).first();
  if (await next.count() && await next.isEnabled()) await next.tap(); 
  await p.waitForTimeout(1300);
}
await p.screenshot({ path: out + '12-contact-final.png' });
L('payload captured: ' + (payload ? payload.slice(0, 300) : 'NONE'));
fs.writeFileSync(out + 'log.txt', log.join('\n'));
await b.close();
