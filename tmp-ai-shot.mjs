import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import fs from 'fs';

const base = 'http://localhost:3200';
const out = process.argv[2] || 'C:/Users/trist/AppData/Local/Temp/claude/C--Users-trist/46a2c5ce-764c-43ac-a6a0-bf3fd98f0e96/scratchpad/shots/';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// largest run of consecutive rows where fewer than 6 pixels exceed brightness 45
async function bands(buf) {
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
const errs = [];
const report = [];

const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 140)));
await p.goto(base + '/ai-infrastructure', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(7000);
await p.mouse.move(700, 450);
await p.waitForTimeout(800);

const total = await p.evaluate(() => document.documentElement.scrollHeight);
const steps = Math.ceil((total - 900) / 700);
for (let i = 0; i <= steps; i++) {
  await p.evaluate(y => window.scrollTo(0, y), i * 700);
  await p.waitForTimeout(1100);
  const y = await p.evaluate(() => Math.round(window.scrollY));
  const buf = await p.screenshot();
  const m = await bands(buf);
  fs.writeFileSync(`${out}d${String(i).padStart(2, '0')}-y${y}.png`, buf);
  report.push(`d${String(i).padStart(2, '0')} y=${y} band=${m.band}px@${m.bandAt} lit=${m.litPct}%`);
}

let ow = 'n/a', mh = 'n/a';
const m = await b.newPage({ ...devices['iPhone 13'] });
m.on('pageerror', e => errs.push('MOB ' + String(e)));
await m.goto(base + '/ai-infrastructure', { waitUntil: 'domcontentloaded' });
await m.waitForTimeout(6000);
mh = await m.evaluate(() => document.documentElement.scrollHeight);
ow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const msteps = Math.min(16, Math.ceil((mh - 844) / 700));
for (let i = 0; i <= msteps; i++) {
  await m.evaluate(y => window.scrollTo(0, y), i * 700);
  await m.waitForTimeout(900);
  const y = await m.evaluate(() => Math.round(window.scrollY));
  const buf = await m.screenshot();
  const r = await bands(buf);
  fs.writeFileSync(`${out}m${String(i).padStart(2, '0')}-y${y}.png`, buf);
  report.push(`m${String(i).padStart(2, '0')} y=${y} band=${r.band}px@${r.bandAt} lit=${r.litPct}%`);
}

report.push(`desktop height=${total} mobile height=${mh} mobile overflow=${ow}`);
report.push('errors: ' + (errs.join(' | ') || 'none'));
fs.writeFileSync(out + 'report.txt', report.join('\n'));
console.log(report.join('\n'));
await b.close();
