import { chromium } from '@playwright/test';

/* Every WebGL program a page links while it boots, named by what its shader
   is for (three's own SHADER_TYPE / SHADER_NAME defines and feature defines),
   with the time each link took — and, for any material that links more than
   once, which defines changed between the two builds (that is the recompile's
   cause: a light count, a clipping plane, a fog or tone-mapping change).
   node design-loop/program-census.mjs [path] [seconds] */

const base = process.env.BASE || 'http://localhost:3300';
const path = process.argv[2] || '/';
const secs = Number(process.argv[3] || 10);
const b = await chromium.launch({
  headless: false,
  args: ['--ignore-gpu-blocklist', '--window-position=-2400,0', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.setDefaultTimeout(60000);
await p.addInitScript(() => {
  const rows = [];
  window.__programs = rows;
  const t0 = performance.now();
  const FLAGS = [
    ['USE_SKINNING', 'skin'], ['USE_MAP', 'map'], ['USE_ENVMAP', 'env'], ['USE_EMISSIVEMAP', 'emissive'], ['USE_NORMALMAP', 'normal'],
    ['USE_ROUGHNESSMAP', 'rough'], ['USE_METALNESSMAP', 'metal'], ['USE_FOG', 'fog'], ['USE_TRANSMISSION', 'transmission'], ['USE_CLEARCOAT', 'clearcoat'],
    ['USE_SHEEN', 'sheen'], ['USE_IRIDESCENCE', 'irid'], ['USE_INSTANCING', 'instanced'], ['USE_COLOR', 'vcolor'], ['USE_ALPHAHASH', 'alphahash'],
    ['USE_SHADOWMAP', 'shadow'], ['USE_UV', 'uv'], ['FLAT_SHADED', 'flat'], ['DOUBLE_SIDED', '2s'], ['USE_LOGDEPTHBUF', 'logdepth'],
  ];
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
    const P = C.prototype;
    const src = new WeakMap();
    const ss = P.shaderSource;
    P.shaderSource = function (sh, s) { src.set(sh, s); return ss.call(this, sh, s); };
    const lp = P.linkProgram;
    const gs = P.getAttachedShaders;
    const gp = P.getProgramParameter;
    P.linkProgram = function (pr) {
      const a = performance.now();
      const r = lp.call(this, pr);
      // force the link to finish so the time is real
      gp.call(this, pr, this.LINK_STATUS);
      const ms = performance.now() - a;
      const shs = gs.call(this, pr) || [];
      let frag = '', vert = '';
      for (const sh of shs) {
        const s = src.get(sh) || '';
        if (this.getShaderParameter(sh, this.SHADER_TYPE) === this.FRAGMENT_SHADER) frag = s; else vert = s;
      }
      const both = vert + '\n' + frag;
      const def = (n) => new RegExp('^#define ' + n + '\\b', 'm').test(both);
      const flags = FLAGS.map(([d, l]) => def(d) && l).filter(Boolean).join(',');
      const type = (both.match(/^#define SHADER_TYPE (.+)$/m) || [])[1] || '';
      const sname = (both.match(/^#define SHADER_NAME (.+)$/m) || [])[1] || '';
      const kind = type ? type.trim() : /Effect|blend\(|BLEND_/.test(frag) ? 'post' : /gl_PointCoord/.test(frag) ? 'points' : 'shader';
      // the defines that decide a program's identity, minus the boilerplate
      const keyDefs = [...new Set(both.split('\n').filter((l) => /^#define (NUM_|USE_|TONE_MAPPING|ALPHATEST|ENVMAP_|FLAT_|DOUBLE_|SHADOW|MAX_|OPAQUE|DECODE|LINEAR|SRGB|DITHER|PREMULT|VERTEX_TEXT|HIGH_PREC|STANDARD|PHYSICAL|IOR|SPECULAR|TRANSMISSION|GGX)/.test(l)).map((l) => l.trim()))].sort();
      const fbo = this.getParameter(this.FRAMEBUFFER_BINDING) ? 'target' : 'canvas';
      const vp = this.getParameter(this.VIEWPORT);
      let h = 0; for (let i = 0; i < both.length; i++) h = (h * 31 + both.charCodeAt(i)) | 0;
      rows.push({ at: Math.round(performance.now() - t0), ms: +ms.toFixed(1), kind, name: sname.trim(), flags, fragLines: frag.split('\n').length, keyDefs, fbo, vp: vp[2] + 'x' + vp[3], src: h });
      return r;
    };
  }
});
await p.goto(base + path, { waitUntil: 'load' });
await p.waitForTimeout(secs * 1000);
const rows = await p.evaluate(() => window.__programs);
await b.close();
console.log('\n' + path + ':  ' + rows.length + ' programs linked in the first ' + secs + 's, ' + rows.reduce((n, r) => n + r.ms, 0).toFixed(0) + 'ms of link time on the main thread\n');
console.log('   at(ms)  link(ms)  kind                        flags                                   name');
for (const r of rows) console.log('  ', String(r.at).padStart(6), String(r.ms).padStart(8), (r.fbo + ' ' + r.vp).padEnd(18), r.kind.padEnd(27), r.flags.padEnd(40), r.name || ('(' + r.fragLines + ' frag lines)'));
// relinks: the same kind+name+flags linked again — what changed in its defines?
const seen = new Map();
const relinks = [];
for (const r of rows) {
  const k = r.kind + '|' + r.name + '|' + r.flags;
  const prev = seen.get(k);
  if (prev) {
    const A = new Set(prev.keyDefs), B = new Set(r.keyDefs);
    const added = r.keyDefs.filter((d) => !A.has(d)), removed = prev.keyDefs.filter((d) => !B.has(d));
    relinks.push({ what: r.kind + (r.name ? ' "' + r.name + '"' : '') + (r.flags ? ' [' + r.flags + ']' : ''), first: prev.at, again: r.at, ms: r.ms, added, removed, where: prev.fbo + ' ' + prev.vp + ' -> ' + r.fbo + ' ' + r.vp, same: prev.src === r.src ? 'identical source' : 'DIFFERENT source' });
  }
  seen.set(k, r);
}
console.log('\nrelinks (same material built again, and what its defines say changed):');
if (!relinks.length) console.log('   none');
for (const x of relinks) console.log('  ', x.ms.toFixed(0).padStart(5) + 'ms', x.what, '  first @' + x.first + 'ms, again @' + x.again + 'ms  (' + x.where + ', ' + x.same + ')', x.added.length || x.removed.length ? '\n        +' + x.added.join(' ') + '\n        -' + x.removed.join(' ') : '');
const byKind = new Map();
for (const r of rows) { const k = r.kind + (r.flags ? ' [' + r.flags + ']' : ''); const e = byKind.get(k) || { n: 0, ms: 0 }; e.n++; e.ms += r.ms; byKind.set(k, e); }
console.log('\nby kind:');
for (const [k, e] of [...byKind.entries()].sort((a, c) => c[1].ms - a[1].ms)) console.log('  ', String(e.n).padStart(3) + 'x', e.ms.toFixed(0).padStart(6) + 'ms', k);
