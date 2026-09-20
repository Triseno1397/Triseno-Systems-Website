import { chromium, devices } from '@playwright/test';
import fs from 'fs';
let sharp = null;
try { sharp = (await import('sharp')).default; } catch {}

const base = 'http://localhost:3200';
const out = 'C:/Users/trist/AppData/Local/Temp/claude/C--Users-trist/46a2c5ce-764c-43ac-a6a0-bf3fd98f0e96/scratchpad/web-r2/';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

async function bands(buf) {
  if (!sharp) return { band: -1, litPct: -1 };
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let run = 0, worst = 0, at = 0, lit = 0;
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * c;
      const b = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      if (b > 45) n++;
    }
    lit += n;
    if (n < 6) { run++; if (run > worst) { worst = run; at = y; } } else run = 0;
  }
  return { band: worst, bandAt: at - worst, litPct: +(100 * lit / (w * h)).toFixed(1) };
}

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [], report = [];
const ROUTE = '/web-design-division';

const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(60000);
p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
await p.goto(base + ROUTE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(700);
fs.writeFileSync(out + 'd-first.png', await p.screenshot());
await p.waitForTimeout(5000);
await p.mouse.move(700, 450);
await p.waitForTimeout(600);

const total = await p.evaluate(() => document.documentElement.scrollHeight);
const steps = Math.min(26, Math.ceil((total - 900) / 900));
for (let i = 0; i <= steps; i++) {
  await p.evaluate(y => window.scrollTo(0, y), i * 900);
  await p.waitForTimeout(1000);
  const y = await p.evaluate(() => Math.round(window.scrollY));
  const buf = await p.screenshot();
  fs.writeFileSync(`${out}d${String(i).padStart(2, '0')}-y${y}.png`, buf);
  const m = await bands(buf);
  report.push(`d${String(i).padStart(2, '0')} y=${y} band=${m.band}px lit=${m.litPct}%`);
}

const m = await b.newPage({ ...devices['iPhone 13'] });
m.setDefaultTimeout(60000);
m.on('pageerror', e => errs.push('MOB ' + String(e).slice(0, 160)));
await m.goto(base + ROUTE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await m.waitForTimeout(700);
fs.writeFileSync(out + 'm-first.png', await m.screenshot());
await m.waitForTimeout(5000);
const mh = await m.evaluate(() => document.documentElement.scrollHeight);
const ow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const msteps = Math.min(20, Math.ceil((mh - 844) / 780));
for (let i = 0; i <= msteps; i++) {
  await m.evaluate(y => window.scrollTo(0, y), i * 780);
  await m.waitForTimeout(900);
  const y = await m.evaluate(() => Math.round(window.scrollY));
  const buf = await m.screenshot();
  fs.writeFileSync(`${out}m${String(i).padStart(2, '0')}-y${y}.png`, buf);
  const r = await bands(buf);
  report.push(`m${String(i).padStart(2, '0')} y=${y} band=${r.band}px lit=${r.litPct}%`);
}

report.push(`desktop h=${total} mobile h=${mh} mobile overflow=${ow}`);
report.push('errors: ' + (errs.join(' | ') || 'none'));
fs.writeFileSync(out + 'report.txt', report.join('\n'));
console.log(report.join('\n'));
await b.close();
