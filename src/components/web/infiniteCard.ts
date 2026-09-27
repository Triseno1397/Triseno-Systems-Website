/* ─────────────────────────────────────────────────────────────────────────
   THE INFINITE CARD — what is drawn inside the demo frame.

   A concept site for a fictional canyon lodge whose hero is a landscape with
   real depth, and in the middle of that landscape hangs a browser frame
   showing the same site, which holds the same frame, all the way down.

   One fragment shader draws all of it:
   - the landscape is a photograph plus its depth map. Tilting the card
     slides near things against far things (the frame's own depth is the
     plane that stays still), and the ferns and rocks nearer than the frame
     stand in front of it;
   - the camera pushes in for good. Each page is the last one scaled by K
     about a fixed point, so after one period the picture is the picture it
     started as: the loop has no seam. The page in FRONT of the glass is
     drawn too (level -1), so what passes the camera leaves by the edges
     rather than vanishing;
   - near things grow faster than far things as they come (a push-in, not a
     zoom), the site's type floats off the glass and fades as it passes, and
     each frame down the tunnel sits a little further from the pointer, so
     the tunnel bends;
   - the waterfalls fall (two phases of the same texture, cross-faded).

   Plain WebGL2, one triangle, four textures. Drawn from the page's shared
   frame loop by DemoFrame; this file owns no clock and reads no layout.
   ───────────────────────────────────────────────────────────────────────── */

export const LAND = { large: "/images/card/canyon-2560.webp", small: "/images/card/canyon-1600.webp" };
const DEPTH = "/images/card/canyon-depth.png";
/** the photograph's own shape */
const IMG_ASPECT = 4096 / 2294;
/** how much of the photograph a page shows: the rest is margin for the
 *  parallax to slide into, so an edge never smears */
const OVERSCAN = 0.93;

export interface CardTuning {
  /** each page is this many times smaller than the one it hangs in */
  k: number;
  /** centre of the nested frame's viewport, from the page's centre (page units) */
  cx: number;
  cy: number;
  /** the depth the frame hangs at (0 far .. 1 near): nearer things cover it */
  depth: number;
  /** tilt parallax, push-in parallax, and the bend of the tunnel */
  par: number;
  push: number;
  bend: number;
}

export const TUNING: CardTuning = { k: 2.6, cx: 0, cy: 0.04, depth: 0.5, par: 0.05, push: 0.34, bend: 0.035 };

export interface CardFonts {
  sans: string;
  mono: string;
}

export interface CardView {
  /** the card's viewport, CSS pixels */
  width: number;
  height: number;
  dpr: number;
  /** the frame's chrome around its viewport, CSS pixels */
  pad: number;
  bar: number;
  hue: string;
}

export interface InfiniteCard {
  /** what the card is drawn on, by name (lib/device gpuClass reads it) */
  gpu: string;
  /** resolves once every texture is on the GPU */
  ready: Promise<void>;
  resize(view: CardView): void;
  draw(tiltX: number, tiltY: number, frac: number, time: number, flow: boolean): void;
  dispose(): void;
}

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  // top-left origin, y down: the way the page and its textures are laid out
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uLand;
uniform sampler2D uDepth;
uniform sampler2D uGlass;
uniform sampler2D uFrame;
uniform vec2 uRes;
uniform vec2 uTilt;
uniform float uFrac;
uniform float uTime;
uniform float uK;
uniform vec2 uC;
uniform float uDF;
uniform vec4 uCrop;   // photograph uv at the page's centre, and per page unit
uniform vec4 uTpp;    // texels per canvas pixel at scale 1: land, depth, glass, frame
uniform vec3 uChrome; // the frame's pad x, pad y and bar, in its viewport's units
uniform float uPar;
uniform float uPush;
uniform float uBend;
uniform float uFlow;

vec2 img(vec2 q) { return uCrop.xy + q * uCrop.zw; }

float box(vec2 p, vec2 lo, vec2 hi, vec2 aa) {
  vec2 a = smoothstep(lo - aa, lo + aa, p) * (1.0 - smoothstep(hi - aa, hi + aa, p));
  return a.x * a.y;
}

void main() {
  // the tunnel bends: each frame hangs a little further from the pointer
  vec2 ct = uC - uTilt * uBend;
  // the one point every page shares: the push-in is a scale about it
  vec2 f = ct * uK / (uK - 1.0);
  float s = pow(uK, uFrac);
  // start one page in FRONT of the glass
  vec2 q = (f + (vUv - 0.5 - f) / s) / uK + ct;
  float sc = s * uK;

  vec3 col = vec3(0.0);
  float T = 1.0;      // how much of this pixel is still to be filled
  float shade = 1.0;  // each frame's inner shadow, carried down

  vec2 lo = vec2(-0.5 - uChrome.x, -0.5 - uChrome.y - uChrome.z);
  vec2 hi = vec2(0.5 + uChrome.x, 0.5 + uChrome.y);

  for (int i = -1; i <= 5; i++) {
    float h = uFrac - float(i); // how far past the glass this page is
    vec2 pq = 1.0 / (uRes * sc);
    float lodD = log2(max(1.0, uTpp.y / sc));

    // where this pixel's piece of the landscape really is: near things are
    // pushed out from the fixed point as they come, and slid by the tilt
    // (one refinement; the pages small enough to be a few pixels of detail
    // take the first guess)
    float rel = textureLod(uDepth, img(q), lodD).r - uDF;
    vec2 u = f + (q - f) * (1.0 - uPush * rel * h) - uTilt * rel * uPar;
    if (i < 2) {
      rel = textureLod(uDepth, img(u), lodD).r - uDF;
      u = f + (q - f) * (1.0 - uPush * rel * h) - uTilt * rel * uPar;
    }
    float D = 0.0;
    vec4 dm = textureLod(uDepth, img(u), lodD);
    D = dm.r;

    // the type on this page's glass, floating off it, gone as it passes
    float fade = 1.0 - smoothstep(0.22, 0.78, h);
    if (fade > 0.003) {
      float off = 1.0 - uDF;
      vec2 gq = f + (q - f) * (1.0 - uPush * off * 1.25 * h) - uTilt * off * uPar * 1.7;
      vec4 g = textureLod(uGlass, gq + 0.5, log2(max(1.0, uTpp.z / sc))) * fade;
      col += T * shade * g.rgb;
      T *= 1.0 - g.a;
    }

    // the frame hanging in this page, behind whatever is nearer than it
    vec2 nq = (q - ct) * uK;
    vec2 pn = pq * uK;
    // Once a page has passed the glass only its nearest things still stand
    // in front, and those thin out before the page is two frames gone: what
    // the camera has passed leaves, it does not hang on the lens. (Both are
    // functions of h alone, so the loop still has no seam.)
    float near = uDF + 0.015 + 0.26 * max(h, 0.0);
    float occ = smoothstep(near, near + 0.07, D) * (1.0 - smoothstep(1.25, 2.0, h));
    float outer = i < 5 ? box(nq, lo, hi, pn) * (1.0 - occ) : 0.0;
    vec4 fr = vec4(0.0);
    float vp = 0.0;
    if (outer > 0.002) {
      fr = textureLod(uFrame, (nq - lo) / (hi - lo), log2(max(1.0, uTpp.w * uK / sc))) * outer;
      vp = box(nq, vec2(-0.5), vec2(0.5), pn) * (1.0 - occ) * (1.0 - fr.a);
    }
    float landA = clamp(1.0 - fr.a - vp, 0.0, 1.0);

    if (landA > 0.003) {
      float lodL = log2(max(1.0, uTpp.x / sc));
      vec2 iu = img(u);
      vec3 land = textureLod(uLand, iu, lodL).rgb;
      if (uFlow > 0.5 && dm.g > 0.02 && sc > 0.3) {
        // falling water: the same texture read from higher up, in two phases
        float t1 = fract(uTime * 0.42);
        float t2 = fract(uTime * 0.42 + 0.5);
        vec2 dir = vec2(0.0, -0.034) * uCrop.zw;
        vec3 a = textureLod(uLand, iu + dir * t1, lodL).rgb;
        vec3 b = textureLod(uLand, iu + dir * t2, lodL).rgb;
        land = mix(land, mix(a, b, abs(1.0 - 2.0 * t1)), dm.g * 0.92);
      }
      // the frame's shadow on what is behind it
      float sh = box(nq - vec2(0.0, 0.045), lo - 0.03, hi + 0.03, vec2(0.09)) * (1.0 - occ);
      land *= 1.0 - 0.34 * sh * (i < 5 ? 1.0 : 0.0);
      col += T * shade * land * landA;
    }
    col += T * shade * fr.rgb;
    T *= vp;
    if (T < 0.004) break;

    // into the frame: its glass is darker toward its edges
    float edge = min(0.5 - abs(nq.x), 0.5 - abs(nq.y));
    shade *= mix(0.7, 1.0, smoothstep(0.0, 0.1, edge));
    q = nq;
    sc /= uK;
  }

  // the light on the card's own glass, moving against the tilt
  vec2 gl = vUv - vec2(0.5 - uTilt.x * 0.55, 0.12 - uTilt.y * 0.4);
  col += vec3(1.0, 0.98, 0.95) * 0.1 * exp(-dot(gl, gl) * 3.2) * (0.35 + length(uTilt));
  outColor = vec4(col, 1.0);
}`;

function shader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("infinite card shader: " + log);
  }
  return s;
}

async function bitmap(url: string): Promise<ImageBitmap | HTMLImageElement> {
  try {
    const blob = await (await fetch(url)).blob();
    // decoded off the main thread, untouched: the depth map is data
    return await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  } catch {
    return await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
  }
}

/* ── the site's type, drawn once per size: what sits on each page's glass ── */
function drawGlass(w: number, h: number, fonts: CardFonts, tall: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  // `tall`: a phone's card, where the type is set larger and there is less of it
  const u = (tall ? w * 1.55 : w) / 100; // one unit: a hundredth of the page
  const spaced = (px: number) => {
    if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  };
  const serif = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;

  // scrims: the type stays readable over a bright landscape
  let g = x.createLinearGradient(0, 0, 0, h * 0.2);
  g.addColorStop(0, "rgba(6, 18, 14, 0.5)");
  g.addColorStop(1, "rgba(6, 18, 14, 0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h * 0.2);
  g = x.createLinearGradient(0, h * (tall ? 0.6 : 0.56), 0, h);
  g.addColorStop(0, "rgba(6, 18, 14, 0)");
  g.addColorStop(1, "rgba(6, 18, 14, 0.62)");
  x.fillStyle = g;
  x.fillRect(0, h * 0.56, w, h * 0.44);

  x.textBaseline = "middle";
  x.fillStyle = "#ffffff";
  // nav
  const navY = u * (tall ? 4.6 : 4.2);
  x.font = `600 ${u * 1.35}px ${fonts.sans}`;
  spaced(u * 0.42);
  x.textAlign = "left";
  x.fillText("ORRIN FALLS", u * 4, navY);
  x.textAlign = "right";
  x.font = `500 ${u * 1.05}px ${fonts.sans}`;
  spaced(u * 0.08);
  const book = "Book a stay";
  const bw = x.measureText(book).width + u * 2.6;
  const bx = w - u * 4;
  x.fillStyle = "#ffffff";
  x.beginPath();
  x.roundRect(bx - bw, navY - u * 1.45, bw, u * 2.9, u * 1.45);
  x.fill();
  x.fillStyle = "#0b2a1f";
  x.fillText(book, bx - u * 1.3, navY + u * 0.05);
  if (!tall) {
    x.fillStyle = "rgba(255, 255, 255, 0.92)";
    let nx = bx - bw - u * 3;
    for (const link of ["Journal", "Trails", "Cabins"]) {
      x.fillText(link, nx, navY);
      nx -= x.measureText(link).width + u * 3;
    }
  }

  // headline, bottom left
  x.textAlign = "left";
  x.fillStyle = "#ffffff";
  spaced(0);
  x.shadowColor = "rgba(4, 14, 10, 0.55)";
  x.shadowBlur = u * 1.6;
  const hs = u * (tall ? 4.1 : 4.7);
  const hy = h - u * (tall ? 13.5 : 14);
  x.font = `400 ${hs}px ${serif}`;
  x.fillText("Go where", u * 4, hy);
  x.font = `italic 400 ${hs}px ${serif}`;
  x.fillText("the water leads.", u * 4, hy + hs * 1.06);
  x.font = `400 ${u * 1.22}px ${fonts.sans}`;
  x.fillStyle = "rgba(255, 255, 255, 0.92)";
  if (!tall) {
    x.textAlign = "right";
    x.fillText("Four cabins, one river, no signal.", w - u * 4, hy + hs * 0.55);
    x.font = `500 ${u * 0.82}px ${fonts.mono}`;
    spaced(u * 0.16);
    x.fillStyle = "rgba(255, 255, 255, 0.72)";
    x.fillText("CONCEPT SITE / FICTIONAL BRAND", w - u * 4, hy + hs * 1.12);
  }
  return c;
}

/* ── the frame that hangs in each page: the card's own chrome, again ── */
function drawFrame(view: CardView, fonts: CardFonts, scale: number): HTMLCanvasElement {
  const { pad, bar } = view;
  const W = view.width + pad * 2;
  const H = view.height + bar + pad * 2;
  const c = document.createElement("canvas");
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const x = c.getContext("2d")!;
  x.scale(c.width / W, c.height / H);
  // the glass bezel
  x.fillStyle = "rgba(214, 200, 255, 0.2)";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(255, 255, 255, 0.85)";
  x.lineWidth = 1.5;
  x.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);
  // the bar
  x.fillStyle = "#000000";
  x.fillRect(pad, pad, view.width, bar);
  x.fillStyle = "#ffffff";
  x.fillRect(pad, pad + bar - 1, view.width, 1);
  const cy = pad + bar / 2;
  for (let i = 0; i < 3; i++) {
    const dx = pad + 10 + i * 14;
    if (i === 0) {
      x.fillStyle = view.hue;
      x.fillRect(dx, cy - 4, 8, 8);
    } else {
      x.strokeStyle = "#ffffff";
      x.lineWidth = 1;
      x.strokeRect(dx + 0.5, cy - 3.5, 7, 7);
    }
  }
  const small = view.width < 480;
  x.font = `400 11px ${fonts.mono}`;
  x.textBaseline = "middle";
  const tag = "CONCEPT";
  if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "2.2px";
  const tw = small ? 0 : x.measureText(tag).width + 12;
  if (!small) {
    x.fillStyle = view.hue;
    x.textAlign = "right";
    x.fillText(tag, pad + view.width - 10, cy + 0.5);
  }
  const ux = pad + 10 + 3 * 14 + 8;
  const uw = view.width - (ux - pad) - 10 - tw;
  x.strokeStyle = "rgba(255, 255, 255, 0.35)";
  x.strokeRect(ux + 0.5, cy - 9.5, uw, 19);
  if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "1.1px";
  x.fillStyle = "#ffffff";
  x.textAlign = "left";
  x.fillText("orrinfalls.example", ux + 10, cy + 0.5);
  // the viewport: a hole, through which the next page shows
  x.clearRect(pad, pad + bar, view.width, view.height);
  return c;
}

export function createInfiniteCard(
  canvas: HTMLCanvasElement,
  fonts: CardFonts,
  large: boolean,
  tuning: CardTuning = TUNING,
): InfiniteCard | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl) return null;

  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("infinite card link: " + gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn(e);
    return null;
  }
  gl.useProgram(prog);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const loc = {
    res: U("uRes"),
    tilt: U("uTilt"),
    frac: U("uFrac"),
    time: U("uTime"),
    k: U("uK"),
    c: U("uC"),
    df: U("uDF"),
    crop: U("uCrop"),
    tpp: U("uTpp"),
    chrome: U("uChrome"),
    par: U("uPar"),
    push: U("uPush"),
    bend: U("uBend"),
    flow: U("uFlow"),
  };
  ["uLand", "uDepth", "uGlass", "uFrame"].forEach((n, i) => gl.uniform1i(U(n), i));

  // one triangle that covers the canvas
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  const tex = [0, 1, 2, 3].map(() => gl.createTexture()!);
  const size = [1, 1, 1, 1];
  const upload = (i: number, src: TexImageSource, w: number, premultiply: boolean) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso && i === 0) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    size[i] = w;
  };

  let alive = true;
  let loaded = false;
  let view: CardView | null = null;
  let crop = [0.5, 0.5, 1, 1];

  const layout = () => {
    if (!view) return;
    const w = Math.max(1, Math.round(view.width * view.dpr));
    const h = Math.max(1, Math.round(view.height * view.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    // the photograph covers the page; an upright page looks at its right
    // half, where the valley opens beside the second waterfall
    const av = view.width / view.height;
    const sx = Math.min(1, av / IMG_ASPECT) * OVERSCAN;
    const sy = Math.min(1, IMG_ASPECT / av) * OVERSCAN;
    const cx = av < IMG_ASPECT * 0.9 ? Math.min(1 - sx / 2, Math.max(sx / 2, 0.6)) : 0.5;
    crop = [cx, 0.5, sx, sy];
    // the type and the frame, at this size
    const gw = Math.min(view.width * view.dpr * 1.6, large ? 2560 : 1536);
    const glass = drawGlass(Math.round(gw), Math.round((gw * view.height) / view.width), fonts, view.width < 560);
    upload(2, glass, glass.width, true);
    const frame = drawFrame(view, fonts, Math.min(2, view.dpr * 1.25));
    upload(3, frame, frame.width, true);
  };

  const ready = (async () => {
    const [land, depth] = await Promise.all([bitmap(large ? LAND.large : LAND.small), bitmap(DEPTH)]);
    if (!alive) return;
    upload(0, land, land.width, false);
    upload(1, depth, depth.width, false);
    if ("close" in land) land.close();
    if ("close" in depth) depth.close();
    loaded = true;
    layout();
  })();

  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    gpu: String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
    ready,
    resize(v) {
      view = v;
      if (loaded) layout();
    },
    draw(tx, ty, frac, time, flow) {
      if (!alive || !loaded || !view || gl.isContextLost()) return;
      const t = tuning;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      for (let i = 0; i < 4; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, tex[i]);
      }
      gl.uniform2f(loc.res, canvas.width, canvas.height);
      gl.uniform2f(loc.tilt, tx, ty);
      gl.uniform1f(loc.frac, frac);
      gl.uniform1f(loc.time, time % 1000);
      gl.uniform1f(loc.k, t.k);
      gl.uniform2f(loc.c, t.cx, t.cy);
      gl.uniform1f(loc.df, t.depth);
      gl.uniform4f(loc.crop, crop[0], crop[1], crop[2], crop[3]);
      gl.uniform4f(
        loc.tpp,
        (size[0] * crop[2]) / canvas.width,
        (size[1] * crop[2]) / canvas.width,
        size[2] / canvas.width,
        size[3] / canvas.width,
      );
      gl.uniform3f(loc.chrome, view.pad / view.width, view.pad / view.height, view.bar / view.height);
      gl.uniform1f(loc.par, t.par);
      gl.uniform1f(loc.push, t.push);
      gl.uniform1f(loc.bend, t.bend);
      gl.uniform1f(loc.flow, flow ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      alive = false;
      tex.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      // hand the GPU memory back now rather than at garbage collection
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
