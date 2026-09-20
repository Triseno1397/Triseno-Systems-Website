import * as THREE from "three";
import { smooth } from "./env";

/* ─────────────────────────────────────────────────────────────────────────
   Procedural textures shared by every world: the wet-ground maps, the glow
   sprite (dust + halos) and the drifting haze bank. All generated on a 2D
   canvas at mount so no world ships an image asset.
   ───────────────────────────────────────────────────────────────────────── */

export function tilingNoise(size: number, cells: number, octaves: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    const c = cells * freq;
    const grid = Float32Array.from({ length: c * c }, () => Math.random());
    const at = (x: number, y: number) => grid[((y + c) % c) * c + ((x + c) % c)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c;
        const fy = (y / size) * c;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    amp *= 0.5;
    freq *= 2;
  }
  return out;
}

export function canvasTexture(
  size: number,
  fill: (img: ImageData) => void,
  repeat: [number, number],
  srgb = false,
) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  fill(img);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface FloorMaps {
  normal: THREE.Texture;
  rough: THREE.Texture;
  distort: THREE.Texture;
}

/** Wet ground: a rippled normal map, puddle roughness, and a distortion map for the mirror. */
export function makeFloorMaps(): FloorMaps {
  const size = 256;
  const h = tilingNoise(size, 6, 4);
  const p = tilingNoise(size, 3, 3);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  const repeat: [number, number] = [10, 16];
  const normal = canvasTexture(
    size,
    (img) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2;
          const dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
          const l = Math.hypot(dx, dy, 1);
          const i = (y * size + x) * 4;
          img.data[i] = (-dx / l) * 127 + 128;
          img.data[i + 1] = (-dy / l) * 127 + 128;
          img.data[i + 2] = (1 / l) * 127 + 128;
          img.data[i + 3] = 255;
        }
    },
    repeat,
  );
  const rough = canvasTexture(
    size,
    (img) => {
      for (let i = 0; i < size * size; i++) {
        // puddles (smooth) inside drier, rougher ground
        const v = smooth(0.42, 0.62, p[i]);
        const g = 30 + v * 190;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
        img.data[i * 4 + 3] = 255;
      }
    },
    [5, 8],
  );
  const distort = canvasTexture(
    size,
    (img) => {
      for (let i = 0; i < size * size; i++) {
        const g = Math.min(255, h[i] * 255);
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
        img.data[i * 4 + 3] = 255;
      }
    },
    repeat,
  );
  return { normal, rough, distort };
}

export function disposeFloorMaps(maps: FloorMaps) {
  maps.normal.dispose();
  maps.rough.dispose();
  maps.distort.dispose();
}

export function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.4)");
  g.addColorStop(0.5, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft, horizontally tiling cloud bank used by the haze layers. */
export function makeHazeTexture(): THREE.Texture {
  const size = 256;
  const n = tilingNoise(size, 4, 4);
  const t = canvasTexture(
    size,
    (img) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const v = y / (size - 1);
          const band = Math.sin(v * Math.PI) ** 2.2; // fades to nothing at top and bottom
          const a = smooth(0.35, 0.85, n[y * size + x]) * band;
          const i = (y * size + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = a * 255;
        }
    },
    [1, 1],
    true,
  );
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
