"use client";

import { useEffect, useMemo, useState } from "react";
import { buildLattice } from "./lattice";

/**
 * 2D fallback for the lattice (M5: mobile and reduced motion get a poster, and
 * it covers the moment before the WebGL chunk arrives). Same lattice data and
 * the same camera as LatticeScene, projected by hand so three.js stays out of
 * the first bundle. Drawn once per width; any motion is a CSS transform.
 */

const CAM = { x: 0, y: 2.3, z: 10.4 };
const LOOK = { x: 0, y: 0.1, z: 0 };
const TAN = Math.tan(((36 / 2) * Math.PI) / 180);

function cameraBasis() {
  const f = { x: LOOK.x - CAM.x, y: LOOK.y - CAM.y, z: LOOK.z - CAM.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl;
  f.y /= fl;
  f.z /= fl;
  // right = f × up(0,1,0)
  const r = { x: -f.z, y: 0, z: f.x };
  const rl = Math.hypot(r.x, r.z);
  r.x /= rl;
  r.z /= rl;
  // up = r × f
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  return { f, r, u };
}

interface Drawn {
  w: number;
  h: number;
  base: string;
  lit: string;
  nodes: string;
  litNodes: string;
  frames: Array<{ d: string; mid: boolean }>;
}

function draw(w: number, h: number): Drawn {
  const lattice = buildLattice();
  const aspect = w / h;
  const wide = aspect > 1.25;
  const { f, r, u } = cameraBasis();
  const ry = -0.44;
  const rx = 0.05;
  const scale = wide ? 1.12 : 0.8;
  const ox = wide ? 2.7 : 0;
  const oy = wide ? 0.15 : 0.9;
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);

  const project = (x: number, y: number, z: number): [number, number] => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const px = x1 * scale + ox - CAM.x;
    const py = y2 * scale + oy - CAM.y;
    const pz = z2 * scale - CAM.z;
    const xc = px * r.x + py * r.y + pz * r.z;
    const yc = px * u.x + py * u.y + pz * u.z;
    const zc = px * f.x + py * f.y + pz * f.z;
    const nx = xc / (zc * TAN * aspect);
    const ny = yc / (zc * TAN);
    return [((nx + 1) / 2) * w, ((1 - ny) / 2) * h];
  };

  const pts: Array<[number, number]> = [];
  const glow = new Float32Array(lattice.count);
  // where the light rests in the still frame
  const lx = (wide ? 0.66 : 0.5) * w;
  const ly = (wide ? 0.44 : 0.3) * h;
  const reach = Math.min(w, h) * (wide ? 0.34 : 0.42);
  for (let i = 0; i < lattice.count; i++) {
    const p = project(lattice.positions[i * 3], lattice.positions[i * 3 + 1], lattice.positions[i * 3 + 2]);
    pts.push(p);
    const k = Math.max(0, 1 - Math.hypot(p[0] - lx, p[1] - ly) / reach);
    glow[i] = k * k * (3 - 2 * k);
  }

  let base = "";
  let lit = "";
  for (let e = 0; e < lattice.edges.length / 2; e++) {
    const a = lattice.edges[e * 2];
    const b = lattice.edges[e * 2 + 1];
    const seg = `M${pts[a][0].toFixed(1)} ${pts[a][1].toFixed(1)}L${pts[b][0].toFixed(1)} ${pts[b][1].toFixed(1)}`;
    if (Math.max(glow[a], glow[b]) > 0.4) lit += seg;
    else base += seg;
  }

  const tri = (x: number, y: number, s: number) =>
    `M${x.toFixed(1)} ${(y - s).toFixed(1)}L${(x + s * 0.87).toFixed(1)} ${(y + s * 0.5).toFixed(1)}L${(x - s * 0.87).toFixed(1)} ${(y + s * 0.5).toFixed(1)}Z`;
  let nodes = "";
  let litNodes = "";
  for (let i = 0; i < lattice.count; i++) {
    if (glow[i] > 0.4) litNodes += tri(pts[i][0], pts[i][1], 3 + glow[i] * 4);
    else nodes += tri(pts[i][0], pts[i][1], 2.4);
  }

  const frames = [0, 1, 2].map((l) => {
    const y = (l - 1) * 1.55;
    const c = [project(-4.9, y, -2.7), project(4.9, y, -2.7), project(4.9, y, 2.7), project(-4.9, y, 2.7)];
    return {
      d: c.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("") + "Z",
      mid: l === 1,
    };
  });

  return { w, h, base, lit, nodes, litNodes, frames };
}

export default function LatticePoster({ hidden = false }: { hidden?: boolean }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const read = () =>
      setBox((prev) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // mobile URL bars resize the height constantly — only redraw on width changes
        if (prev && prev.w === w && Math.abs(prev.h - h) < 140) return prev;
        return { w, h };
      });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const drawn = useMemo(() => (box ? draw(box.w, box.h) : null), [box]);
  if (!drawn) return null;

  return (
    <svg
      aria-hidden="true"
      className="ai-poster"
      data-hidden={hidden ? "" : undefined}
      viewBox={`0 0 ${drawn.w} ${drawn.h}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {drawn.frames.map((fr, i) => (
        <path
          key={i}
          d={fr.d}
          stroke={fr.mid ? "#00b4d8" : "#ffffff"}
          strokeOpacity={fr.mid ? 0.55 : 0.16}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={drawn.base} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={drawn.nodes} fill="#ffffff" fillOpacity="0.5" />
      <path d={drawn.lit} stroke="#00b4d8" strokeOpacity="0.9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={drawn.litNodes} fill="#00b4d8" className="ai-poster__lit" />
    </svg>
  );
}
