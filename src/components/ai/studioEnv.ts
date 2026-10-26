import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────────────
   THE STUDIO THE CHROME REFLECTS — painted, not rendered.

   The hero's chrome used to mirror three's RoomEnvironment: a lit grey room
   rendered into a cube map and filtered (PMREMGenerator.fromScene), which
   compiled the room's own lit materials on the main thread — most of a
   second on a laptop, more on a phone, before the first frame.

   This paints the same kind of room straight into an HDR equirectangular
   texture in plain JS: grey walls, a darker floor, a hot ceiling light, a
   few softboxes, and the division's cyan panel where the old one stood. The
   values are high-range (a softbox is 10, not 1), so the chrome's speculars
   still go to white under the tone mapper. Filtering it is one cheap
   equirect pass (fromEquirectangular); nothing is rendered or lit.
   ───────────────────────────────────────────────────────────────────────── */

interface Panel {
  /** the direction the panel sits in, from the centre */
  dir: [number, number, number];
  /** angular size, degrees */
  w: number;
  h: number;
  /** linear colour, HDR */
  rgb: [number, number, number];
  /** edge softness, degrees */
  soft?: number;
}

const PANELS: Panel[] = [
  // the ceiling light
  { dir: [0.05, 1, 0.1], w: 70, h: 34, rgb: [12, 12, 12], soft: 6 },
  // a softbox high on the right, the key for the core
  { dir: [0.8, 0.35, 0.5], w: 30, h: 22, rgb: [9, 9, 9.2], soft: 3 },
  // the division's cyan panel, where the room had it
  { dir: [-0.83, 0.28, 0.46], w: 40, h: 13, rgb: [0, 4.2, 5.1], soft: 2.5 },
  // a panel on the back wall
  { dir: [0.2, 0.2, -0.95], w: 26, h: 36, rgb: [5, 5, 5.2], soft: 3 },
  // a thin strip low in front: the floor's line of light on the chrome
  { dir: [0, -0.16, 0.98], w: 90, h: 4, rgb: [3.5, 3.5, 3.6], soft: 1.5 },
  // fill, left and behind
  { dir: [-0.6, 0.1, -0.8], w: 22, h: 22, rgb: [2.4, 2.4, 2.5], soft: 3 },
];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** the room, as a half-float equirectangular texture (w x h texels; 256 x 128
 *  is plenty for soft panels, and a quarter of the paint of 512 x 256) */
export function paintStudioEnv(w = 256, h = 128): THREE.DataTexture {
  const data = new Uint16Array(w * h * 4);
  const dirs = PANELS.map((p) => {
    const l = Math.hypot(...p.dir) || 1;
    return p.dir.map((v) => v / l) as [number, number, number];
  });
  const px = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    // v runs 0 at the bottom row of the texture (flipY: the top row is v=1)
    const v = 1 - (y + 0.5) / h;
    const lat = (v - 0.5) * Math.PI;
    const cy = Math.sin(lat);
    const cl = Math.cos(lat);
    // the room: a darker floor, grey walls, a brighter ceiling
    const up = (cy + 1) / 2;
    const wall = 0.06 + 0.3 * smooth(0.15, 0.95, up) + 0.5 * smooth(0.88, 1, up);
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      // three: u = atan(dir.z, dir.x) / 2pi + 0.5
      const lon = (u - 0.5) * Math.PI * 2;
      const dx = Math.cos(lon) * cl;
      const dz = Math.sin(lon) * cl;
      px[0] = wall;
      px[1] = wall;
      px[2] = wall * 1.03;
      for (let i = 0; i < PANELS.length; i++) {
        const p = PANELS[i];
        const d = dirs[i];
        // the panel's own frame: its right and up vectors
        const ax = -d[2];
        const az = d[0];
        const al = Math.hypot(ax, az) || 1;
        const rx = ax / al;
        const rz = az / al;
        const ux = -d[1] * rz;
        const uy = rx * d[2] - rz * d[0];
        const uz = d[1] * rx;
        const dot = dx * d[0] + cy * d[1] + dz * d[2];
        if (dot <= 0) continue;
        // angular offsets from the panel's centre, degrees
        const ox = (Math.atan2(dx * rx + dz * rz, dot) * 180) / Math.PI;
        const oy = (Math.atan2(dx * ux + cy * uy + dz * uz, dot) * 180) / Math.PI;
        const s = p.soft ?? 3;
        const k = (1 - smooth(p.w / 2 - s, p.w / 2 + s, Math.abs(ox))) * (1 - smooth(p.h / 2 - s, p.h / 2 + s, Math.abs(oy)));
        if (k <= 0) continue;
        px[0] += p.rgb[0] * k;
        px[1] += p.rgb[1] * k;
        px[2] += p.rgb[2] * k;
      }
      const o = (y * w + x) * 4;
      data[o] = THREE.DataUtils.toHalfFloat(px[0]);
      data[o + 1] = THREE.DataUtils.toHalfFloat(px[1]);
      data[o + 2] = THREE.DataUtils.toHalfFloat(px[2]);
      data[o + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}
