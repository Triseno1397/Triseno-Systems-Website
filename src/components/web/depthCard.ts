/* ─────────────────────────────────────────────────────────────────────────
   THE DEPTH CARD — what is drawn in (and around) the demo frame.

   One window onto a place: a canyon, or a redwood grove (SCENES). Each is
   built the way a film plate is: three layers, each a picture with its own
   depth map (design-loop/card-textures.py),
     near  the ferns and boulders under the window
     mid   the cliffs and falls, or the great trunks, with the ground painted
           in behind the ferns
     far   the valley or the deep forest, painted in behind them
   so when the camera moves there is picture behind everything that moves.

   - A CHANGE OF WORLD, in depth. Switching scenes, the new world does not
     fade in: it arrives from the horizon toward you. A front of light sweeps
     from the farthest thing to the nearest, and everything behind it is
     already the new place; the ferns at the glass go last.

   - A FLIGHT, not a zoom. The camera travels forward into the canyon. Every
     surface is at its own distance, so the ferns sweep out past the window's
     edges, the falls go by, and the far valley walls hardly move. At the end
     of the run it flies into the valley's sunlit haze and comes out of it at
     the start: always forward, no cut.
   - A WINDOW. Leaning the card moves the camera sideways behind the glass,
     so the valley slides against the frame the way a view does through a real
     window, and what is nearer than the glass moves the other way.
   - OUT OF THE FRAME. The canvas is larger than the window. Inside the window
     it draws the scene; outside it draws the near layer only, so the ferns
     and boulders stand in front of the frame, past its edges.

   How: for each pixel and each layer a ray is marched from the camera through
   planes of distance, near to far, until it meets that layer's surface (then
   closed in on). Plain WebGL2, one triangle, six textures a scene; while a
   change of world runs, the new one is drawn a second time over the old. Drawn from the
   page's shared frame loop by DemoFrame; this file owns no clock and reads
   no layout.
   ───────────────────────────────────────────────────────────────────────── */

export interface CardScene {
  key: string;
  /** the scene's name on the switch */
  name: string;
  /** the concept site's address bar */
  url: string;
  /** where the flight heads, in the photograph */
  vx: number;
  vy: number;
  /** where an upright (phone) window looks, across the photograph */
  tallX: number;
  /** its waterfalls fall */
  water: boolean;
  /** the concept site's type */
  brand: string;
  line1: string;
  line2: string;
  sub: string;
}

export const SCENES: CardScene[] = [
  {
    key: "canyon",
    name: "Canyon",
    url: "orrinfalls.example",
    vx: 0.575,
    vy: 0.4,
    tallX: 0.6,
    water: true,
    brand: "ORRIN FALLS",
    line1: "Go where",
    line2: "the water leads.",
    sub: "Four cabins, one river, no signal.",
  },
  {
    key: "redwood",
    name: "Redwoods",
    url: "hollowaygrove.example",
    vx: 0.515,
    vy: 0.5,
    tallX: 0.5,
    water: false,
    brand: "HOLLOWAY GROVE",
    line1: "Sleep beneath",
    line2: "the tallest trees.",
    sub: "Six cabins in an old-growth grove.",
  },
];
const files = (key: string, photo: string) => [
  photo,
  `/images/card/${key}-mid.webp`,
  `/images/card/${key}-far.webp`,
  `/images/card/${key}-a.png`,
  `/images/card/${key}-b.png`,
];
/** seconds a change of world takes */
const WIPE = 1.9;
/** the photograph's own shape */
const IMG_ASPECT = 4096 / 2294;
/** how much of the photograph's height the window shows: the band around it
 *  is what the camera leans into, and what stands outside the frame */
const SHOWN = 0.8;
/** the canvas reaches this far past the window on every side (of its size) */
export const MARGIN = 0.17;

export interface CardTuning {
  /** how far the camera travels (the nearest surface is 1 away, the sky 14) */
  travel: number;
  /** how far it moves sideways at full lean */
  lean: number;
  /** the glass, as a depth (0 far .. 1 near): nearer things stand in front of it */
  glass: number;
}

export const TUNING: CardTuning = { travel: 0.92, lean: 0.1, glass: 0.74 };

export interface CardFonts {
  sans: string;
  mono: string;
}

export interface CardView {
  /** the window, CSS pixels */
  width: number;
  height: number;
  dpr: number;
}

export interface DepthCard {
  /** what the card is drawn on, by name (lib/device gpuClass reads it) */
  gpu: string;
  /** resolves once the first scene is on the GPU */
  ready: Promise<void>;
  /** the scene shown (or arriving) */
  scene(): number;
  /** change world; resolves when the new one has begun to arrive */
  show(i: number): Promise<void>;
  /** load a scene ahead of being asked for it */
  preload(i: number): void;
  /** 1 = every plane of distance is marched; less, fewer (weaker graphics) */
  quality(q: number): void;
  resize(view: CardView): void;
  /** tilt -1..1, flight 0..1 (one run), seconds, falling water on or off */
  draw(tiltX: number, tiltY: number, flight: number, time: number, flow: boolean): void;
  dispose(): void;
}

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vW;
uniform vec2 uSpan;
void main() {
  // window units: -0.5..0.5 across the window, beyond that in the margin; y down
  vW = vec2(aPos.x, -aPos.y) * 0.5 * uSpan;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vW;
out vec4 outColor;
uniform sampler2D uLand;  // the photograph
uniform sampler2D uMid;   // the plate without the ferns
uniform sampler2D uFar;   // the plate without the cliffs
uniform sampler2D uA;     // r depth of the near layer, g falling water, b near matte
uniform sampler2D uB;     // r depth of the mid layer, g depth of the far layer, b mid matte
uniform sampler2D uGlass;
uniform vec2 uRes;    // the window, canvas pixels
uniform vec2 uTilt;
uniform float uFlight;
uniform float uTime;
uniform vec4 uCrop;   // photograph uv at the window's centre, and per window unit
uniform vec2 uV;
uniform vec4 uTpp;    // texels per canvas pixel: land, plates, data, glass
uniform float uQ;
uniform float uFlow;
uniform float uTravel;
uniform float uLean;
uniform float uGlassD;
uniform float uMargin;
uniform float uWipe;   // the front of a change of world (as nearness); < -0.5: none
uniform float uGlassW; // how much of this scene's type is on the glass

const float ZN = 1.0;
const float ZF = 14.0;
const vec3 HAZE = vec3(1.0, 0.985, 0.95);

// the depth maps are nearness; distance runs the other way, and not evenly
float disp(float D) { return mix(1.0 / ZF, 1.0 / ZN, D); }

float box(vec2 p, vec2 lo, vec2 hi, vec2 aa) {
  vec2 a = smoothstep(lo - aa, lo + aa, p) * (1.0 - smoothstep(hi - aa, hi + aa, p));
  return a.x * a.y;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// the camera, set in main
float d;
vec2 o;
vec2 pg;
// (held inside the photograph: at its edge the last of it is carried on)
vec2 ray(float z) { return clamp(uV + (pg * (z - d) + o) / z, 0.002, 0.998); }

// a layer's surface: one smooth sheet, carried on past the layer's own edges
// (its matte does the cutting, so a ray never meets a wall)
float surface(int L, vec2 q, float lod) {
  if (L == 0) return textureLod(uA, q, lod).r;
  vec4 b = textureLod(uB, q, lod);
  return L == 1 ? b.r : b.g;
}

// March a layer from the plane at d0 to the plane at d1; where the ray first
// goes under its surface, close in. Returns the distance, or -1.
float march(int L, float d0, float d1, float steps, out vec2 qh) {
  float prev = d0;
  for (int k = 0; k < 16; k++) {
    if (float(k) >= steps) break;
    float dk = mix(d0, d1, (float(k) + 1.0) / steps);
    float z = 1.0 / dk;
    vec2 q = ray(z);
    {
      float lod = log2(max(1.0, uTpp.z * (z - d) / z));
      if (disp(surface(L, q, lod)) >= dk) {
        float lo = prev;
        float hi = dk;
        for (int r = 0; r < 4; r++) {
          float mid = 0.5 * (lo + hi);
          if (disp(surface(L, ray(1.0 / mid), lod)) >= mid) hi = mid; else lo = mid;
        }
        qh = ray(1.0 / hi);
        return 1.0 / hi;
      }
    }
    prev = dk;
  }
  return -1.0;
}

// what is behind the ferns is the mid plate; behind the cliffs, the far plate
vec3 picture(int L, vec2 q, float z) {
  float mag = (z - d) / z;
  // a little under the ideal mip: crisp rather than soft (the photograph is
  // 4K and the anisotropic filter keeps it from shimmering)
  float lodL = max(0.0, log2(max(1.0, uTpp.x * mag)) - 0.5);
  vec3 c = textureLod(uLand, q, lodL).rgb;
  if (L > 0) {
    float lodP = log2(max(1.0, uTpp.y * mag));
    // the mattes, a little wider than the layer they cut: nothing of what was
    // in front is left on its edge, and no wider (past the edge the plates
    // show what they painted in, not the view, and it drew a seam)
    float near = smoothstep(0.08, 0.34, textureLod(uA, q, 1.6).b);
    if (near > 0.003) c = mix(c, textureLod(uMid, q, lodP).rgb, near);
    if (L > 1) {
      float mid = smoothstep(0.1, 0.36, textureLod(uB, q, 1.6).b);
      if (mid > 0.003) c = mix(c, textureLod(uFar, q, lodP).rgb, mid);
    }
  }
  if (L == 1 && uFlow > 0.5) {
    float w = textureLod(uA, q, 1.0).g;
    if (w > 0.02) {
      // falling water: the same texture read from higher up, in two phases
      float t1 = fract(uTime * 0.42);
      float t2 = fract(uTime * 0.42 + 0.5);
      vec3 wa = textureLod(uLand, q + vec2(0.0, -0.032) * t1, lodL).rgb;
      vec3 wb = textureLod(uLand, q + vec2(0.0, -0.032) * t2, lodL).rgb;
      c = mix(c, mix(wa, wb, abs(1.0 - 2.0 * t1)), w * 0.92);
    }
  }
  // the air between the camera and the far walls, thicker as it flies
  float far = smoothstep(2.0, 11.0, z - d);
  c = mix(c, HAZE, far * (0.06 + 0.45 * smoothstep(0.3, 1.0, uFlight)));
  // a finishing grade: a touch more contrast and colour, the look of a
  // graded photograph rather than a flat one
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.1);
  return clamp((c - 0.5) * 1.07 + 0.5, 0.0, 1.0);
}

void main() {
  vec2 aa = 1.0 / uRes;
  float inside = box(vW, vec2(-0.5), vec2(0.5), aa);
  vec2 p = uCrop.xy + vW * uCrop.zw;

  // the camera: forward along the flight, sideways with the lean. The glass
  // is the plane that does not move when it leans.
  // it gathers speed: most of a run is spent near the start, among the ferns
  d = uTravel * pow(uFlight, 1.25);
  o = uTilt * vec2(uLean, uLean * 0.62);
  pg = p - uV - o * disp(uGlassD);

  float dStart = min(1.0 / ZN, 1.0 / (d + 0.05));
  vec3 col = vec3(0.0);
  float T = 1.0;
  float zSeen = ZF;
  vec2 q;

  // near to far; outside the window, the near layer only
  for (int L = 0; L < 3; L++) {
    if (L > 0 && inside < 0.001) break;
    float d1 = L == 0 ? disp(0.3) : L == 1 ? disp(0.08) : 1.0 / ZF;
    float d0 = L == 2 ? min(dStart, disp(0.9)) : dStart;
    if (d1 >= d0) continue;
    float steps = ceil((L == 0 ? 8.0 : L == 1 ? 14.0 : 6.0) * uQ);
    float z = march(L, d0, d1, steps, q);
    if (z < 0.0) continue;
    // what passes the camera thins out as it goes
    float a = smoothstep(d + 0.04, d + 0.4, z);
    if (L == 0) a *= smoothstep(0.35, 0.65, textureLod(uA, q, 0.0).b);
    else {
      if (L == 1) a *= smoothstep(0.35, 0.65, textureLod(uB, q, 0.0).b);
      a *= inside;
    }
    if (a < 0.004) continue;
    col += T * a * picture(L, q, z);
    T *= 1.0 - a;
    zSeen = min(zSeen, z);
    if (T < 0.02) break;
  }

  float alpha = 1.0 - T;
  // A change of world: this (new) scene is drawn over the old one only where
  // it is farther than the front; the front sweeps from the horizon to the
  // glass, a line of light riding it.
  if (uWipe > -0.5) {
    float Dn = zSeen < ZF - 0.01 ? (1.0 / zSeen - 1.0 / ZF) / (1.0 / ZN - 1.0 / ZF) : 0.0;
    if (inside > 0.001 && T > 0.02) Dn = 0.0; // the sky: the far haze goes first
    float m = 1.0 - smoothstep(uWipe - 0.045, uWipe, Dn);
    float edge = exp(-pow((Dn - uWipe + 0.012) / 0.02, 2.0)) * (1.0 - smoothstep(1.0, 1.1, uWipe));
    col *= m;
    alpha *= m;
    T = mix(1.0, T, m);
    float e = edge * max(inside, alpha) * 0.85;
    col += vec3(0.86, 0.82, 1.0) * e;
    alpha = max(alpha, e);
  }
  if (inside > 0.001) {
    // nothing met: the far haze
    if (T > 0.02 && uWipe < -0.5) {
      vec2 qf = clamp(ray(ZF), 0.0, 1.0);
      // shaded exactly as a hit on the far layer would be: a different
      // shade here drew a hard diagonal where the sky runs past the far map
      col += T * inside * picture(2, qf, ZF);
      alpha += T * inside;
    }

    // spray and pollen in the air, at their own distances: they pass the camera
    float m = 0.0;
    for (int j = 0; j < 3; j++) {
      float z = 1.2 + float(j) * 0.7;
      float rel = z - d;
      if (rel < 0.1 || z > zSeen) continue;
      vec2 xw = (pg * rel + o) * vec2(1.0, uCrop.w / uCrop.z * uRes.y / uRes.x) * 7.0;
      xw += vec2(uTime * 0.012, -uTime * 0.02) + float(j) * 19.7;
      vec2 id = floor(xw);
      if (hash(id) > 0.62) {
        vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) * 0.6 - 0.3;
        float r = length(fract(xw) - 0.5 - off);
        m += smoothstep(0.05, 0.0, r) * (0.35 + 0.65 * hash(id + 1.3)) * smoothstep(0.1, 0.5, rel);
      }
    }
    col += vec3(1.0, 0.97, 0.88) * m * 0.5 * inside * alpha;

    // into the light at the end of the run, and out of it at the start
    // a bright mist rather than a blank: the valley stays faintly there
    float white = smoothstep(0.8, 1.0, uFlight) + (1.0 - smoothstep(0.0, 0.09, uFlight));
    col = mix(col, HAZE * alpha, clamp(white, 0.0, 1.0) * 0.82 * inside);

    // the site's type, on the glass and a little off it
    vec4 g = textureLod(uGlass, vW + 0.5 - uTilt * vec2(0.010, 0.007), log2(max(1.0, uTpp.w))) * inside * uGlassW;
    col = col * (1.0 - g.a) + g.rgb;
    alpha = alpha * (1.0 - g.a) + g.a;

    // the light on the glass, moving against the lean
    vec2 gl = vW - vec2(-uTilt.x * 0.55, -0.38 - uTilt.y * 0.4);
    col += vec3(1.0, 0.98, 0.95) * 0.09 * exp(-dot(gl, gl) * 3.2) * (0.35 + length(uTilt)) * inside * alpha;
  } else {
    // what stands outside the frame leaves with the light too, and thins
    // out before the canvas ends: it is never cut by a straight line
    float white = smoothstep(0.84, 1.0, uFlight) + (1.0 - smoothstep(0.0, 0.07, uFlight));
    vec2 past = (abs(vW) - 0.5) / uMargin;
    float keep = (1.0 - clamp(white, 0.0, 1.0)) * (1.0 - smoothstep(0.45, 0.96, max(past.x, past.y)));
    // and once it has swept past, it is gone: nothing is left hanging there
    keep *= 1.0 - smoothstep(0.3, 0.52, d);
    col *= keep;
    alpha *= keep;
  }
  outColor = vec4(col, alpha);
}`;

function shader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("depth card shader: " + log);
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

/* ── the site's type, drawn once per size: what sits on the glass ── */
function drawGlass(w: number, h: number, fonts: CardFonts, tall: boolean, sc: CardScene): HTMLCanvasElement {
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
  g = x.createLinearGradient(0, h * 0.56, 0, h);
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
  x.fillText(sc.brand, u * 4, navY);
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
  x.shadowColor = "rgba(4, 14, 10, 0.6)";
  x.shadowBlur = u * 1.6;
  const hs = u * (tall ? 4.1 : 5);
  const hy = h - u * (tall ? 13.5 : 14.5);
  x.font = `400 ${hs}px ${serif}`;
  x.fillText(sc.line1, u * 4, hy);
  x.font = `italic 400 ${hs}px ${serif}`;
  x.fillText(sc.line2, u * 4, hy + hs * 1.06);
  x.font = `400 ${u * 1.22}px ${fonts.sans}`;
  x.fillStyle = "rgba(255, 255, 255, 0.92)";
  if (!tall) {
    x.textAlign = "right";
    x.fillText(sc.sub, w - u * 4, hy + hs * 0.55);
    x.font = `500 ${u * 0.82}px ${fonts.mono}`;
    spaced(u * 0.16);
    x.fillStyle = "rgba(255, 255, 255, 0.72)";
    x.fillText("CONCEPT SITE / FICTIONAL BRAND", w - u * 4, hy + hs * 1.12);
  }
  return c;
}

export function createDepthCard(
  canvas: HTMLCanvasElement,
  fonts: CardFonts,
  large: boolean,
  tuning: CardTuning = TUNING,
): DepthCard | null {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("depth card link: " + gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn(e);
    return null;
  }
  gl.useProgram(prog);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const loc = {
    span: U("uSpan"),
    res: U("uRes"),
    tilt: U("uTilt"),
    flight: U("uFlight"),
    time: U("uTime"),
    crop: U("uCrop"),
    v: U("uV"),
    tpp: U("uTpp"),
    q: U("uQ"),
    flow: U("uFlow"),
    travel: U("uTravel"),
    lean: U("uLean"),
    glassD: U("uGlassD"),
    margin: U("uMargin"),
    wipe: U("uWipe"),
    glassW: U("uGlassW"),
  };
  ["uLand", "uMid", "uFar", "uA", "uB", "uGlass"].forEach((n, i) => gl.uniform1i(U(n), i));

  // one triangle that covers the canvas
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  // each scene's six textures: photograph, mid plate, far plate, data A, data B, type
  const sets = SCENES.map(() => ({
    tex: [0, 1, 2, 3, 4, 5].map(() => gl.createTexture()!),
    size: [1, 1, 1, 1, 1, 1],
    loaded: false,
    loading: null as Promise<void> | null,
    crop: [0.5, 0.5, 1, 1],
  }));
  type TexSet = (typeof sets)[number];
  const upload = (set: TexSet, i: number, src: TexImageSource, w: number, premultiply: boolean) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, set.tex[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso && i === 0) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    set.size[i] = w;
  };

  let alive = true;
  let quality = 1;
  let view: CardView | null = null;
  let win = [1, 1]; // the window, canvas pixels
  let cur = 0;
  let next = -1;
  let wipeAt = -1; // when the change of world began (set on its first draw)

  // a scene's crop and type, for the window's size
  const typeFor = (k: number) => {
    const set = sets[k];
    if (!view || !set.loaded) return;
    // the window shows the middle of the photograph; an upright one looks
    // where the scene opens
    const av = view.width / view.height;
    const sy = SHOWN * Math.min(1, IMG_ASPECT / av);
    const sx = (sy * av) / IMG_ASPECT;
    const half = sx * (0.5 + MARGIN);
    const cx = av < IMG_ASPECT * 0.9 ? Math.min(1 - half, Math.max(half, SCENES[k].tallX)) : 0.5;
    set.crop = [cx, 0.5, sx, sy];
    const gw = Math.min(view.width * view.dpr * 1.5, large ? 2560 : 1536);
    const glass = drawGlass(Math.round(gw), Math.round((gw * view.height) / view.width), fonts, view.width < 560, SCENES[k]);
    upload(set, 5, glass, glass.width, true);
  };

  const layout = () => {
    if (!view) return;
    const span = 1 + MARGIN * 2;
    const w = Math.max(1, Math.round(view.width * span * view.dpr));
    const h = Math.max(1, Math.round(view.height * span * view.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    win = [w / span, h / span];
    gl.viewport(0, 0, w, h);
    sets.forEach((_, k) => typeFor(k));
  };

  const load = (k: number) => {
    const set = sets[k];
    if (set.loading) return set.loading;
    // the 4K photograph wherever the window is drawn wider than the 2560 one
    // could fill without magnifying it
    const dense = typeof window !== "undefined" && window.innerWidth * (window.devicePixelRatio || 1) >= 1800;
    const key = SCENES[k].key;
    const photo = `/images/card/${key}-${large ? (dense ? 4096 : 2560) : 1600}.webp`;
    set.loading = (async () => {
      const all = await Promise.all(files(key, photo).map(bitmap));
      if (!alive) return;
      all.forEach((im, i) => {
        upload(set, i, im, im.width, false);
        if ("close" in im) im.close();
      });
      set.loaded = true;
      typeFor(k);
    })();
    return set.loading;
  };

  const ready = load(0);

  const pass = (k: number, tx: number, ty: number, flight: number, time: number, flow: boolean, wipe: number, glassW: number) => {
    const t = tuning;
    const set = sets[k];
    const sc = SCENES[k];
    for (let i = 0; i < 6; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, set.tex[i]);
    }
    const c = set.crop;
    const sz = set.size;
    gl.uniform4f(loc.crop, c[0], c[1], c[2], c[3]);
    gl.uniform2f(loc.v, sc.vx, sc.vy);
    gl.uniform4f(loc.tpp, (sz[0] * c[2]) / win[0], (sz[1] * c[2]) / win[0], (sz[3] * c[2]) / win[0], sz[5] / win[0]);
    gl.uniform1f(loc.flow, flow && sc.water ? 1 : 0);
    gl.uniform1f(loc.wipe, wipe);
    gl.uniform1f(loc.glassW, glassW);
    gl.uniform2f(loc.span, 1 + MARGIN * 2, 1 + MARGIN * 2);
    gl.uniform2f(loc.res, win[0], win[1]);
    gl.uniform2f(loc.tilt, tx, ty);
    gl.uniform1f(loc.flight, flight);
    gl.uniform1f(loc.time, time % 1000);
    gl.uniform1f(loc.q, quality);
    gl.uniform1f(loc.travel, t.travel);
    gl.uniform1f(loc.lean, t.lean);
    gl.uniform1f(loc.glassD, t.glass);
    gl.uniform1f(loc.margin, MARGIN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    gpu: String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
    ready,
    scene: () => (next >= 0 ? next : cur),
    preload(i) {
      if (i >= 0 && i < sets.length) load(i);
    },
    async show(i) {
      if (i < 0 || i >= sets.length) return;
      if (next >= 0) {
        // mid-change: what is arriving becomes what is there
        cur = next;
        next = -1;
      }
      if (i === cur) return;
      await load(i);
      if (!alive) return;
      next = i;
      wipeAt = -1;
    },
    quality(q) {
      quality = Math.max(0.4, Math.min(1, q));
    },
    resize(v) {
      view = v;
      layout();
    },
    draw(tx, ty, flight, time, flow) {
      if (!alive || !view || gl.isContextLost() || !sets[cur].loaded) return;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (next < 0) {
        pass(cur, tx, ty, flight, time, flow, -1, 1);
        return;
      }
      if (wipeAt < 0) wipeAt = time;
      const k = Math.min(1, (time - wipeAt) / WIPE);
      const e = k * k * (3 - 2 * k);
      const g = Math.min(1, Math.max(0, (k - 0.3) / 0.45));
      // the old world, its type going; the new one over it, from the horizon in
      pass(cur, tx, ty, flight, time, flow, -1, 1 - g);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      pass(next, tx, ty, flight, time, flow, -0.06 + 1.2 * e, g);
      gl.disable(gl.BLEND);
      if (k >= 1) {
        cur = next;
        next = -1;
      }
    },
    dispose() {
      alive = false;
      sets.forEach((set) => set.tex.forEach((t) => gl.deleteTexture(t)));
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      // hand the GPU memory back now rather than at garbage collection
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
