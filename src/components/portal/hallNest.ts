/* ─────────────────────────────────────────────────────────────────────────
   THE HALL, TRAVELLED.

   The hall of doors is one rendered still (/tour/plate-doors-*.webp): a
   concrete hall of lit portals, one behind the next. A still can only be
   pushed in so far before it is a blur, so the camera does not zoom the
   picture: the picture is nested in itself. Through the first portal stands
   the same hall again, smaller, where the render's own second portal was;
   through that one, again; and so on. Pushing in by one portal brings the
   nested copy to exactly where its parent stood, so the walk can go on for
   as long as the scroll does and the portal in front of the camera is always
   drawn from full-resolution pixels.

   Each copy ("layer") owns the slab of hall between its portal and the next:
   its walls and skylight show inside its portal's outline, and the floor in
   front of it takes its reflections (lightened onto the floor already
   there, so every portal keeps the reflection under its own legs). Far
   layers sit in haze, layers the camera has reached fall out of the light,
   and a layer goes once the next portal's outline covers the whole view.

   Everything is drawn on one 2D canvas from the decoded plate; nothing here
   touches layout.
   ───────────────────────────────────────────────────────────────────────── */

export interface HallPlate {
  src: string;
  w: number;
  h: number;
  /** the point every portal converges on: the nest's centre of similarity */
  cx: number;
  cy: number;
  /** size of each hall relative to the one it stands in */
  q: number;
  /** y of the floor line under the first portal */
  base: number;
  /** outline of the first portal's concrete, in plate pixels */
  sil: Array<[number, number]>;
}

export const HALL_PLATES: { wide: HallPlate; tall: HallPlate } = {
  wide: {
    src: "/tour/plate-doors-wide.webp",
    w: 2752,
    h: 1536,
    cx: 1376,
    cy: 931,
    q: 0.62,
    base: 1005,
    sil: [
      [943, 20],
      [1809, 20],
      [1904, 1005],
      [848, 1005],
    ],
  },
  tall: {
    src: "/tour/plate-doors-m.webp",
    w: 1392,
    h: 2304,
    cx: 690,
    cy: 1342,
    q: 0.62,
    base: 1497,
    sil: [
      [62, 108],
      [1331, 108],
      [1392, 470],
      [1392, 1497],
      [0, 1497],
      [0, 570],
    ],
  },
};

type Source = CanvasImageSource & { width: number; height: number };
interface Mip {
  c: Source;
  /** this level's size relative to the plate */
  s: number;
}

export interface HallSprites {
  plate: HallPlate;
  full: Mip[];
  /** the floor in front of the first portal, feathered at its sides and bottom */
  patch: Mip[];
  /** bounding box of the outline */
  box: [number, number, number, number];
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** the deepest layer drawn: this many portals ahead, a hall is a few pixels wide */
const E_MIN = -5.2;
/** haze on the far portals, darkness on the reached ones, and how far the
 *  bright floor under a passed portal is let go */
const FOG = 0.33;
const DARK = 0.5;
const SHEEN = 0.5;

/** Halved copies of a picture, so a far hall is drawn from pixels near its own size. */
function mipsOf(src: Source, w: number, h: number, levels: number): Mip[] {
  const out: Mip[] = [{ c: src, s: 1 }];
  let prev: Source = src;
  let pw = w;
  let ph = h;
  for (let i = 1; i < levels; i++) {
    const cw = Math.max(1, Math.round(pw / 2));
    const ch = Math.max(1, Math.round(ph / 2));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const x = c.getContext("2d");
    if (!x) break;
    x.imageSmoothingQuality = "high";
    x.drawImage(prev, 0, 0, pw, ph, 0, 0, cw, ch);
    out.push({ c, s: cw / w });
    prev = c;
    pw = cw;
    ph = ch;
  }
  return out;
}

/** Cut the plate into what the walk draws from. Runs once per plate. */
export function buildHall(img: Source, plate: HallPlate): HallSprites | null {
  const full = mipsOf(img, plate.w, plate.h, 4);
  const ph = plate.h - plate.base;
  const pc = document.createElement("canvas");
  pc.width = plate.w;
  pc.height = ph;
  const x = pc.getContext("2d");
  if (!x) return null;
  x.drawImage(img, 0, plate.base, plate.w, ph, 0, 0, plate.w, ph);
  x.globalCompositeOperation = "destination-in";
  let g = x.createLinearGradient(0, 0, plate.w, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.09, "#000");
  g.addColorStop(0.91, "#000");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, plate.w, ph);
  g = x.createLinearGradient(0, 0, 0, ph);
  g.addColorStop(0, "#000");
  g.addColorStop(0.8, "#000");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, plate.w, ph);
  const patch = mipsOf(pc, plate.w, ph, 4);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [sx, sy] of plate.sil) {
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  return { plate, full, patch, box: [minX, minY, maxX, maxY] };
}

/** the smallest level still at least as large as it will be drawn */
const pick = (mips: Mip[], scale: number): Mip => {
  let m = mips[0];
  for (const k of mips) if (k.s >= scale * 0.98) m = k;
  return m;
};

/**
 * How many portals in a layer may go: the exponent at which the NEXT
 * portal's outline covers the whole view above its own floor line, so
 * nothing of this layer but floor is left on screen. Depends on the view's
 * shape; measured once per resize.
 */
export function hallCover(plate: HallPlate, W: number, H: number): number {
  const c = Math.max(W / plate.w, H / plate.h);
  const vx = W / 2 + (plate.cx - plate.w / 2) * c;
  const vy = H / 2 + (plate.cy - plate.h / 2) * c;
  const r = 1 / plate.q;
  for (let e = 0; e < 8; e += 0.02) {
    const z = c * Math.pow(r, e);
    const pts = plate.sil.map(([sx, sy]) => [vx + (sx - plate.cx) * z, vy + (sy - plate.cy) * z]);
    const yb = Math.min(H, vy + (plate.base - plate.cy) * z) - 1;
    const inside = (px: number, py: number) => {
      let ins = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
      }
      return ins;
    };
    if (inside(1, 1) && inside(W - 1, 1) && inside(1, yb) && inside(W - 1, yb)) return e + 1;
  }
  return 8;
}

/**
 * Draw the hall with the camera `u` portals down it (0 = the render as it
 * was shot, 1 = standing where the second portal was, and so on).
 */
export function drawHall(ctx: CanvasRenderingContext2D, W: number, H: number, S: HallSprites, u: number, cover: number) {
  const { plate: P, full, patch, box } = S;
  const r = 1 / P.q;
  const c = Math.max(W / P.w, H / P.h);
  const vx = W / 2 + (P.cx - P.w / 2) * c;
  const vy = H / 2 + (P.cy - P.h / 2) * c;
  const eA = cover + 0.05;
  const eB = eA + 0.7;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const at = Math.max(0, u);
  const k0 = Math.max(0, Math.ceil(at - eB + 1e-6));
  const k1 = Math.floor(at - E_MIN);
  const [bx0, by0, bx1, by1] = box;
  for (let k = k0; k <= k1; k++) {
    const e = at - k;
    const z = c * Math.pow(r, e);
    const a = (1 - smooth(eA, eB, e)) * smooth(E_MIN, E_MIN + 0.7, e);
    if (a <= 0.003) continue;
    const X = (sx: number) => vx + (sx - P.cx) * z;
    const Y = (sy: number) => vy + (sy - P.cy) * z;
    const m = pick(full, z);
    // what the camera has already reached falls out of the light
    const dark = e > 0 ? DARK * smooth(0, 1.6, e) : 0;
    ctx.globalCompositeOperation = "source-over";
    if (k === 0) {
      // the hall the camera starts in: the whole render, walls and all
      ctx.globalAlpha = a;
      ctx.drawImage(m.c, X(0), Y(0), P.w * z, P.h * z);
      if (dark > 0.004) {
        ctx.globalAlpha = dark;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
      }
      continue;
    }
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < P.sil.length; i++) {
      const [sx, sy] = P.sil[i];
      if (i) ctx.lineTo(X(sx), Y(sy));
      else ctx.moveTo(X(sx), Y(sy));
    }
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = a;
    ctx.drawImage(m.c, bx0 * m.s, by0 * m.s, (bx1 - bx0) * m.s, (by1 - by0) * m.s, X(bx0), Y(by0), (bx1 - bx0) * z, (by1 - by0) * z);
    // air between here and there: the far portals sit in haze
    const s = e < 0 ? FOG * (1 - Math.exp(-1.6 * (Math.pow(r, -e) - 1))) : 0;
    if (s > 0.004) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgb(${Math.round(255 * s)},${Math.round(245 * s)},${Math.min(255, Math.round(275 * s))})`;
      ctx.fillRect(X(bx0), Y(by0), (bx1 - bx0) * z, (by1 - by0) * z);
    }
    if (dark > 0.004) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = dark;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    // its reflections land on the floor in front of it
    const pm = pick(patch, z);
    ctx.globalCompositeOperation = "lighten";
    ctx.globalAlpha = a * (1 - s * 0.9) * (1 - dark) * (1 - SHEEN * smooth(0.3, 1.5, e));
    ctx.drawImage(pm.c, X(0), Y(P.base), P.w * z, (P.h - P.base) * z);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
