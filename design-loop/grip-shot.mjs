import { chromium } from '@playwright/test';
/* Close-ups of the Operator's hands with the move frozen at one instant:
   ?opt=<seconds>&opm=spin|jump&opc=hand|lhand&opz=<zoom>  (Operator.tsx).
   While a hand cam is asked for, the portal's camera rig stands down.
   Rendered through SwiftShader: these are still frames, and a software context
   never gets dropped the way the shared GPU one does on this machine. */
const BASE = process.env.BASE || 'http://localhost:3300';
const b = await chromium.launch({
  headless: false,
  args: ['--disable-gpu-sandbox', '--window-position=-2400,0'],
});
const p = await b.newPage({ viewport: { width: 900, height: 700 } }); p.setDefaultTimeout(150000);
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
p.on('console', m => { if (/Context Lost/i.test(m.text())) errs.push('context lost'); });
const tag = process.env.TAG || '';
const extra = process.env.EXTRA || '';
for (const f of (process.env.FRAMES || 'spin,2.2,hand').split(';').filter(Boolean)) {
  const [move, t, cam] = f.split(',');
  await p.goto(`${BASE}/?opt=${t}&opm=${move}&opc=${cam}${extra}`, { waitUntil: 'load' });
  await p.waitForTimeout(Number(process.env.SETTLE || 16000));
  await p.screenshot({ path: `design-loop/shots/grip-${move}-${t}-${cam}${tag}.png` });
}
console.log('errors', errs.length ? errs[0] : 'none');
await b.close();
