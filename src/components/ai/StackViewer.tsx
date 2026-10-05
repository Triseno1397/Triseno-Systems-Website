"use client";

import "@/app/ai-stack.css";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { deviceClass } from "@/lib/device";

/**
 * Fig. 03, the stack: the four layers every engagement builds, as a model
 * you can pick up.
 *
 *   Data       glass pucks: the systems and sources you already own
 *   Models     a drafted lattice of nodes, a few of them live
 *   Agents     one orchestrator over a ring of six workers
 *   Interface  three standing panes: the tools your team already uses
 *
 * Plates of frosted glass with ink hairline edges and a drafting grid,
 * exploded one above the other; cyan pulses run up the beams between them.
 * Drag to turn it (with inertia); left alone it turns by itself. Wheel or
 * pinch zooms only once the model is engaged (clicked or focused) or with a
 * trackpad pinch, so the page's scroll is never taken. Numbered hotspots ride
 * the right-hand edge of each plate; opening one parts the stack around that
 * layer, eases the camera to it and shows its sheet.
 *
 * Plain three.js on one transparent canvas over the paper. Draws only while
 * on screen and the tab is visible; disposed on unmount. Reduced motion: no
 * auto-turn, pulses at rest, camera changes without easing. No WebGL: a drawn
 * elevation of the stack, and the sheets still work.
 */

interface Layer {
  n: string;
  name: string;
  sub: string;
  body: string;
  spec: [string, string][];
}

const LAYERS: Layer[] = [
  {
    n: "01",
    name: "Data",
    sub: "Your systems & sources",
    body: "The CRM, the ERP, the shared inbox, the warehouse and the files nobody has opened since 2019. Connected read-first and indexed where they live, so nothing leaves your cloud.",
    spec: [
      ["Sources", "14 connected"],
      ["Access", "Read-first"],
      ["Residency", "Your tenant"],
    ],
  },
  {
    n: "02",
    name: "Models",
    sub: "Reasoning & retrieval",
    body: "The right model for each job, routed by cost and accuracy, grounded in your own records through retrieval, and scored against an evaluation set before anything ships.",
    spec: [
      ["Routing", "Cost + accuracy"],
      ["Grounding", "Your records"],
      ["Release gate", "412 eval cases"],
    ],
  },
  {
    n: "03",
    name: "Agents",
    sub: "Orchestrator + workers",
    body: "One orchestrator plans the work; six specialised workers carry it out: drafting, reconciling, filing, chasing. Every step is logged and every action sits inside a permission you set.",
    spec: [
      ["Workers", "6 specialised"],
      ["Audit trail", "Every step"],
      ["Limits", "Set by you"],
    ],
  },
  {
    n: "04",
    name: "Interface",
    sub: "Your team's tools",
    body: "Results land where people already work: the team chat, the inbox, the CRM, one dashboard. No new app to learn, and a person approves anything that matters.",
    spec: [
      ["Surfaces", "Chat · inbox · CRM"],
      ["Approval", "Human in the loop"],
      ["New apps", "0"],
    ],
  },
];

/* ── geometry constants (world units) ─────────────────────────────────── */
const PW = 3.0; // plate width (x)
const PD = 2.0; // plate depth (z)
const PT = 0.11; // plate thickness: thick enough to read as glass
const TOP = PT / 2;
const SPACING = 0.82;
const PART = 0.62; // extra gap opened around a focused layer
const DIM = 0.28; // weight of the layers that are not in focus

const INK = new THREE.Color("#0b0e0f");
const SIGNAL = new THREE.Color("#00b4d8");

/* frosted glass: whitish, fresnel-brightened edges, a drafting grid on top */
const GLASS_VERT = `
varying vec3 vN;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const GLASS_FRAG = `
uniform vec3 uInk;
uniform vec3 uSignal;
uniform float uOpacity;
uniform float uFocus;
uniform float uGrid;
uniform float uTop;
varying vec3 vN;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  float fr = pow(1.0 - abs(dot(n, v)), 2.2);
  // frosted glass with a little thickness: a cool tint in the body, the
  // sides denser than the face, a studio softbox sliding across the top
  // face and a bright lip where the edges catch the light
  float isTop = step(uTop - 0.0005, vLocal.y);
  float isSide = 1.0 - step(0.5, abs(n.y));
  vec3 col = mix(vec3(0.90, 0.94, 0.955), vec3(0.985, 0.99, 0.995), isTop);
  col = mix(col, vec3(0.74, 0.8, 0.83), isSide * 0.55);
  float a = 0.24 + fr * 0.5 + isSide * 0.22;
  // the softbox: a broad diagonal band of light on the top face, read in view
  // space so it slides as the stack turns
  vec3 r = reflect(-v, n);
  float box = smoothstep(0.55, 0.95, r.y) * smoothstep(0.75, 0.15, abs(r.x + 0.25));
  col = mix(col, vec3(1.0), box * 0.75 * isTop);
  a += box * 0.18 * isTop;
  // edge lip: the rim of each face glows a touch, cyan on the focused layer
  col += fr * vec3(0.06, 0.08, 0.09);
  // the drafting grid, on the top face only
  float top = step(uTop - 0.0005, vLocal.y) * uGrid;
  vec2 g = vLocal.xz / 0.25;
  vec2 w = fwidth(g);
  vec2 gd = abs(fract(g - 0.5) - 0.5) / max(w, vec2(0.0001));
  float line = 1.0 - min(min(gd.x, gd.y), 1.0);
  col = mix(col, uInk, line * 0.4 * top);
  a += line * 0.08 * top;
  col = mix(col, uSignal, uFocus * (0.14 + isSide * 0.3));
  a += uFocus * 0.08;
  gl_FragColor = vec4(col, a * uOpacity);
}`;

/* beams: an ink hairline with a cyan comet running up it */
const BEAM_VERT = `
attribute float aU;
attribute float aSeed;
attribute float aAlpha;
varying float vU;
varying float vSeed;
varying float vAlpha;
void main() {
  vU = aU; vSeed = aSeed; vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BEAM_FRAG = `
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uSignal;
varying float vU;
varying float vSeed;
varying float vAlpha;
void main() {
  float head = fract(uTime * 0.32 + vSeed);
  float behind = head - vU;
  if (behind < 0.0) behind += 1.0;
  float tail = 0.24;
  float pulse = behind < tail ? pow(1.0 - behind / tail, 2.0) : 0.0;
  vec3 col = mix(uInk, uSignal, pulse);
  gl_FragColor = vec4(col, (0.2 + pulse * 0.8) * vAlpha);
}`;

/* the comet heads: round cyan points with a soft halo */
const HEAD_VERT = `
attribute float aAlpha;
uniform float uSize;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * (10.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const HEAD_FRAG = `
uniform vec3 uSignal;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float core = smoothstep(0.2, 0.12, d);
  float halo = smoothstep(0.5, 0.0, d) * 0.35;
  gl_FragColor = vec4(uSignal, max(core, halo) * vAlpha);
}`;

/* the floor: a soft ink pool under the stack (a scene object, not UI) */
const FLOOR_FRAG = `
varying vec2 vUv;
uniform float uOpacity;
void main() {
  float d = length((vUv - 0.5) * vec2(1.0, 1.25)) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d));
  gl_FragColor = vec4(0.043, 0.055, 0.059, a * a * 0.16 * uOpacity);
}`;
const FLOOR_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

type Weighted = { mat: THREE.Material & { opacity: number }; base: number };

interface Link {
  a: number;
  pa: THREE.Vector3;
  b: number;
  pb: THREE.Vector3;
  seed: number;
  flat: boolean;
}

const SEG = 20;

export default function StackViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLSpanElement>(null);
  const spotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const focusRef = useRef<number | null>(null);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    focusRef.current = focus;
    kickRef.current();
  }, [focus]);

  const toggle = useCallback((i: number) => setFocus((f) => (f === i ? null : i)), []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const host = hostRef.current;
    if (!viewer || !host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cls = deviceClass();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cls === "high" ? 2 : cls === "mid" ? 1.25 : 1));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const root = new THREE.Group();
    scene.add(root);

    /* ── materials ── */
    const weighted: Weighted[][] = [[], [], [], []];
    const glassMats: THREE.ShaderMaterial[][] = [[], [], [], []];
    const edgeMats: THREE.LineBasicMaterial[] = [];
    const glass = (layer: number, grid = 0, top = TOP) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: GLASS_VERT,
        fragmentShader: GLASS_FRAG,
        uniforms: {
          uInk: { value: INK },
          uSignal: { value: SIGNAL },
          uOpacity: { value: 1 },
          uFocus: { value: 0 },
          uGrid: { value: grid },
          uTop: { value: top },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      glassMats[layer].push(m);
      return m;
    };
    const line = (layer: number, opacity: number, color = INK) => {
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      weighted[layer].push({ mat: m, base: opacity });
      return m;
    };
    const solid = (layer: number, color: THREE.Color, opacity = 1) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      weighted[layer].push({ mat: m, base: opacity });
      return m;
    };
    const edges = (geo: THREE.BufferGeometry, mat: THREE.Material, threshold = 1) =>
      new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), mat);
    const rectLine = (w: number, d: number, y: number, mat: THREE.Material) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2, y, -d / 2),
        new THREE.Vector3(w / 2, y, -d / 2),
        new THREE.Vector3(w / 2, y, d / 2),
        new THREE.Vector3(-w / 2, y, d / 2),
      ]);
      return new THREE.LineLoop(g, mat);
    };

    /* ── the four plates ── */
    const groups: THREE.Group[] = [];
    const plates: THREE.Mesh[] = [];
    const plateGeo = new THREE.BoxGeometry(PW, PT, PD);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.position.y = (i - 1.5) * SPACING;
      const plate = new THREE.Mesh(plateGeo, glass(i, 1));
      plate.userData.layer = i;
      plate.renderOrder = 1;
      g.add(plate);
      const em = new THREE.LineBasicMaterial({ color: INK.clone(), transparent: true, opacity: 0.62, depthWrite: false });
      edgeMats.push(em);
      weighted[i].push({ mat: em, base: 0.62 });
      g.add(edges(plateGeo, em));
      // an inset border on the top face, and corner ticks outside the plate
      g.add(rectLine(PW - 0.18, PD - 0.18, TOP + 0.001, line(i, 0.22)));
      const tickMat = line(i, 0.45);
      const tk: THREE.Vector3[] = [];
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const x = (sx * PW) / 2 + sx * 0.08;
          const z = (sz * PD) / 2 + sz * 0.08;
          tk.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x - sx * 0.16, 0, z));
          tk.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 0, z - sz * 0.16));
        }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tk), tickMat));
      root.add(g);
      groups.push(g);
      plates.push(plate);
    }

    /* ── 01 data: glass pucks ── */
    const pucks: THREE.Vector3[] = [];
    {
      const g = groups[0];
      const cyl = new THREE.CylinderGeometry(0.21, 0.21, 0.15, 40, 1);
      const em = line(0, 0.7);
      const ring = line(0, 0.3);
      const ringGeo = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 41 }, (_, k) => {
          const a = (k / 40) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * 0.21, 0, Math.sin(a) * 0.21);
        }),
      );
      const dotMat = solid(0, SIGNAL);
      const dotGeo = new THREE.SphereGeometry(0.032, 12, 8);
      for (const z of [-0.45, 0.45])
        for (const x of [-0.95, 0, 0.95]) {
          const m = new THREE.Mesh(cyl, glass(0));
          m.position.set(x, TOP + 0.075, z);
          g.add(m);
          const e = edges(cyl, em, 30);
          e.position.copy(m.position);
          g.add(e);
          const r = new THREE.Line(ringGeo, ring);
          r.position.set(x, TOP + 0.075, z);
          g.add(r);
          const top = new THREE.Vector3(x, TOP + 0.15, z);
          const d = new THREE.Mesh(dotGeo, dotMat);
          d.position.copy(top);
          g.add(d);
          pucks.push(top);
        }
      // a row of source ticks along the front edge
      const ticks: THREE.Vector3[] = [];
      for (let k = 0; k < 15; k++) {
        const x = -1.2 + k * (2.4 / 14);
        ticks.push(new THREE.Vector3(x, TOP + 0.002, PD / 2 - 0.2), new THREE.Vector3(x, TOP + 0.002, PD / 2 - 0.28 - (k % 3 === 0 ? 0.06 : 0)));
      }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), line(0, 0.4)));
    }

    /* ── 02 models: a drafted lattice ── */
    const rows = [
      [-1.0, -0.33, 0.33, 1.0].map((x) => new THREE.Vector3(x, TOP + 0.05, -0.55)),
      [-1.2, -0.6, 0, 0.6, 1.2].map((x) => new THREE.Vector3(x, TOP + 0.05, 0)),
      [-1.0, -0.33, 0.33, 1.0].map((x) => new THREE.Vector3(x, TOP + 0.05, 0.55)),
    ];
    {
      const g = groups[1];
      const seg: THREE.Vector3[] = [];
      for (let r = 0; r < 2; r++) for (const p of rows[r]) for (const q of rows[r + 1]) seg.push(p, q);
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), line(1, 0.2)));
      const nodeGeo = new THREE.SphereGeometry(0.05, 14, 10);
      const ink = solid(1, INK);
      const live = solid(1, SIGNAL);
      const liveSet = new Set(["0,1", "1,2", "2,3", "1,4"]);
      rows.forEach((row, r) =>
        row.forEach((p, k) => {
          const m = new THREE.Mesh(nodeGeo, liveSet.has(`${r},${k}`) ? live : ink);
          m.position.copy(p);
          g.add(m);
        }),
      );
    }

    /* ── 03 agents: orchestrator over a ring of workers ── */
    const orch = new THREE.Vector3(0, TOP + 0.26, 0);
    const workers: THREE.Vector3[] = [];
    {
      const g = groups[2];
      const oct = new THREE.OctahedronGeometry(0.2, 0);
      const o = new THREE.Mesh(oct, glass(2));
      o.position.copy(orch);
      g.add(o);
      const oe = edges(oct, line(2, 0.85));
      oe.position.copy(orch);
      g.add(oe);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), solid(2, SIGNAL));
      core.position.copy(orch);
      g.add(core);
      // the orchestrator's mast down to the plate
      g.add(
        new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, TOP, 0), new THREE.Vector3(0, orch.y - 0.2, 0)]),
          line(2, 0.45),
        ),
      );
      const ringPts = Array.from({ length: 97 }, (_, k) => {
        const a = (k / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 1.08, TOP + 0.002, Math.sin(a) * 0.64);
      });
      const ringLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPts),
        (() => {
          const m = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
          weighted[2].push({ mat: m, base: 0.35 });
          return m;
        })(),
      );
      ringLine.computeLineDistances();
      g.add(ringLine);
      const box = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const be = line(2, 0.75);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const p = new THREE.Vector3(Math.cos(a) * 1.08, TOP + 0.075, Math.sin(a) * 0.64);
        const m = new THREE.Mesh(box, glass(2));
        m.position.copy(p);
        g.add(m);
        const e = edges(box, be);
        e.position.copy(p);
        g.add(e);
        workers.push(p.clone().setY(TOP + 0.15));
      }
    }

    /* ── 04 interface: three standing panes ── */
    const panes: THREE.Vector3[] = [];
    {
      const g = groups[3];
      const specs = [
        { x: -0.85, z: -0.2, w: 0.92, h: 0.6, ry: 0.14 },
        { x: 0.22, z: 0.2, w: 0.72, h: 0.46, ry: -0.06 },
        { x: 1.05, z: -0.38, w: 0.52, h: 0.66, ry: -0.22 },
      ];
      const em = line(3, 0.8);
      const ui = line(3, 0.32);
      const liveMat = solid(3, SIGNAL);
      for (const s of specs) {
        const pane = new THREE.Group();
        pane.position.set(s.x, TOP + s.h / 2 + 0.02, s.z);
        pane.rotation.y = s.ry;
        const pg = new THREE.PlaneGeometry(s.w, s.h);
        pane.add(new THREE.Mesh(pg, glass(3)));
        pane.add(edges(pg, em));
        // abstract interface rules (no legible text)
        const rule: THREE.Vector3[] = [];
        const top = s.h / 2 - 0.1;
        rule.push(new THREE.Vector3(-s.w / 2, top, 0.001), new THREE.Vector3(s.w / 2, top, 0.001));
        for (let k = 0; k < 3; k++) {
          const y = top - 0.1 - k * 0.08;
          const len = (s.w - 0.16) * (k === 1 ? 0.55 : 0.8);
          rule.push(new THREE.Vector3(-s.w / 2 + 0.08, y, 0.001), new THREE.Vector3(-s.w / 2 + 0.08 + len, y, 0.001));
        }
        pane.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rule), ui));
        const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), liveMat);
        sq.position.set(s.w / 2 - 0.08, top + 0.05, 0.002);
        pane.add(sq);
        g.add(pane);
        panes.push(new THREE.Vector3(s.x, TOP + 0.02, s.z));
      }
    }

    /* ── the beams between layers, and within the agents layer ── */
    const nearest = (p: THREE.Vector3, list: THREE.Vector3[]) =>
      list.reduce((best, q) => (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? q : best), list[0]);
    const links: Link[] = [];
    let seed = 0.13;
    const nextSeed = () => (seed = (seed + 0.618034) % 1);
    for (const p of pucks) links.push({ a: 0, pa: p, b: 1, pb: nearest(p, p.z < 0 ? rows[0] : rows[2]), seed: nextSeed(), flat: false });
    for (const p of rows[1]) {
      const to = Math.abs(p.x) < 0.01 ? orch : nearest(p, workers);
      links.push({ a: 1, pa: p, b: 2, pb: to, seed: nextSeed(), flat: false });
    }
    for (const w of workers) links.push({ a: 2, pa: orch, b: 2, pb: w, seed: nextSeed(), flat: true });
    for (const w of workers) links.push({ a: 2, pa: w, b: 3, pb: nearest(w, panes), seed: nextSeed(), flat: false });
    links.push({ a: 2, pa: orch, b: 3, pb: panes[1], seed: nextSeed(), flat: false });

    const L = links.length;
    const beamPos = new Float32Array(L * SEG * 2 * 3);
    const beamU = new Float32Array(L * SEG * 2);
    const beamSeed = new Float32Array(L * SEG * 2);
    const beamAlpha = new Float32Array(L * SEG * 2);
    links.forEach((ln, li) => {
      for (let k = 0; k < SEG; k++) {
        const o = (li * SEG + k) * 2;
        beamU[o] = k / SEG;
        beamU[o + 1] = (k + 1) / SEG;
        beamSeed[o] = beamSeed[o + 1] = ln.seed;
      }
    });
    const beamGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(beamPos, 3).setUsage(THREE.DynamicDrawUsage);
    const alphaAttr = new THREE.BufferAttribute(beamAlpha, 1).setUsage(THREE.DynamicDrawUsage);
    beamGeo.setAttribute("position", posAttr);
    beamGeo.setAttribute("aU", new THREE.BufferAttribute(beamU, 1));
    beamGeo.setAttribute("aSeed", new THREE.BufferAttribute(beamSeed, 1));
    beamGeo.setAttribute("aAlpha", alphaAttr);
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uTime: { value: 0 }, uInk: { value: INK }, uSignal: { value: SIGNAL } },
      transparent: true,
      depthWrite: false,
    });
    const beams = new THREE.LineSegments(beamGeo, beamMat);
    beams.frustumCulled = false;
    beams.renderOrder = 2;
    root.add(beams);

    const headPos = new Float32Array(L * 3);
    const headAlpha = new Float32Array(L);
    const headGeo = new THREE.BufferGeometry();
    const headPosAttr = new THREE.BufferAttribute(headPos, 3).setUsage(THREE.DynamicDrawUsage);
    const headAlphaAttr = new THREE.BufferAttribute(headAlpha, 1).setUsage(THREE.DynamicDrawUsage);
    headGeo.setAttribute("position", headPosAttr);
    headGeo.setAttribute("aAlpha", headAlphaAttr);
    const headMat = new THREE.ShaderMaterial({
      vertexShader: HEAD_VERT,
      fragmentShader: HEAD_FRAG,
      uniforms: { uSignal: { value: SIGNAL }, uSize: { value: 10 } },
      transparent: true,
      depthWrite: false,
    });
    const heads = new THREE.Points(headGeo, headMat);
    heads.frustumCulled = false;
    heads.renderOrder = 3;
    root.add(heads);

    /* ── the floor: a soft pool and a drafted turntable ring ── */
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: { uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 5.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.renderOrder = 0;
    root.add(floor);
    const turnMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.16, depthWrite: false });
    const turnPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 128; k++) {
      const a = (k / 128) * Math.PI * 2;
      turnPts.push(new THREE.Vector3(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25));
    }
    const turn = new THREE.Line(new THREE.BufferGeometry().setFromPoints(turnPts), turnMat);
    const turnTicks: THREE.Vector3[] = [];
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const r2 = k % 6 === 0 ? 2.42 : 2.33;
      turnTicks.push(new THREE.Vector3(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25), new THREE.Vector3(Math.cos(a) * r2, 0, Math.sin(a) * r2));
    }
    const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(turnTicks), turnMat);
    const floorY = -1.5 * SPACING - PART - 0.35;
    floor.position.y = turn.position.y = ticks.position.y = floorY;
    root.add(turn, ticks);

    /* ── state ── */
    const st = {
      w: 1,
      h: 1,
      yaw: -0.62,
      pitch: 0.44,
      vel: 0,
      auto: 0,
      zoom: 1,
      zoomT: 1,
      camY: 0,
      camD: 1,
      wide: true,
      y: groups.map((g) => g.position.y),
      wt: [1, 1, 1, 1],
      fc: [0, 0, 0, 0],
      lastInput: -1e9,
      dragging: false,
      engaged: false,
      visible: false,
      raf: 0,
      time: 0,
      readTick: 0,
    };
    const camTarget = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C1 = new THREE.Vector3();
    const C2 = new THREE.Vector3();

    const resize = () => {
      const r = host.getBoundingClientRect();
      st.w = Math.max(1, r.width);
      st.h = Math.max(1, r.height);
      st.wide = window.matchMedia("(min-width: 1024px)").matches;
      renderer.setSize(st.w, st.h, false);
      camera.aspect = st.w / st.h;
      camera.updateProjectionMatrix();
    };

    const bez = (t: number, out: THREE.Vector3) => {
      const u = 1 - t;
      return out
        .copy(A)
        .multiplyScalar(u * u * u)
        .addScaledVector(C1, 3 * u * u * t)
        .addScaledVector(C2, 3 * u * t * t)
        .addScaledVector(B, t * t * t);
    };
    const setCurve = (ln: Link) => {
      A.copy(ln.pa);
      A.y += st.y[ln.a];
      B.copy(ln.pb);
      B.y += st.y[ln.b];
      if (ln.flat) {
        C1.lerpVectors(A, B, 0.33).y += 0.14;
        C2.lerpVectors(A, B, 0.66).y += 0.14;
      } else {
        const h = (B.y - A.y) * 0.55;
        C1.copy(A).y += h;
        C2.copy(B).y -= h;
      }
    };

    const ease = (cur: number, to: number, dt: number, rate: number) => (reduced ? to : cur + (to - cur) * (1 - Math.exp(-dt * rate)));

    const frame = (dt: number, now: number) => {
      const f = focusRef.current;

      // turning: drag velocity with inertia, then a slow idle turn
      if (!st.dragging) {
        st.vel *= Math.exp(-dt * 3.2);
        const idle = !reduced && now - st.lastInput > 2600;
        st.auto = ease(st.auto, idle ? (f === null ? 0.16 : 0.06) : 0, dt, 1.6);
        st.yaw += st.vel * dt + st.auto * dt;
      }

      // parting the stack around a focused layer
      for (let i = 0; i < 4; i++) {
        const base = (i - 1.5) * SPACING;
        const to = f === null ? base : base + (i > f ? PART : i < f ? -PART : 0);
        st.y[i] = ease(st.y[i], to, dt, 5);
        groups[i].position.y = st.y[i];
        st.wt[i] = ease(st.wt[i], f === null || f === i ? 1 : DIM, dt, 6);
        st.fc[i] = ease(st.fc[i], f === i ? 1 : 0, dt, 6);
        for (const w of weighted[i]) w.mat.opacity = w.base * st.wt[i];
        for (const m of glassMats[i]) {
          m.uniforms.uOpacity.value = 0.35 + 0.65 * st.wt[i];
          m.uniforms.uFocus.value = st.fc[i];
        }
        edgeMats[i].color.copy(INK).lerp(SIGNAL, st.fc[i]);
        edgeMats[i].opacity = 0.62 * st.wt[i] + 0.3 * st.fc[i];
      }

      // camera: eases to the focused layer, a little closer
      const fitD = st.w / st.h < 1 ? 12.6 : st.w / st.h < 1.3 ? 11.2 : 10.2;
      st.zoom = ease(st.zoom, st.zoomT, dt, 8);
      st.camY = ease(st.camY, f === null ? 0.1 : st.y[f], dt, 4);
      st.camD = ease(st.camD, f === null ? 1 : 0.8, dt, 4);
      const d = fitD * st.zoom * st.camD;
      // on wide screens the sheet sits on the left, so the stack sits right
      const shift = st.wide ? -1.15 * st.zoom * st.camD : 0;
      camTarget.set(shift, st.camY, 0);
      camera.position.set(shift, st.camY + Math.sin(st.pitch) * d, Math.cos(st.pitch) * d);
      camera.lookAt(camTarget);
      root.rotation.y = st.yaw;

      // beams and their comet heads
      st.time += reduced ? 0 : dt;
      beamMat.uniforms.uTime.value = st.time;
      links.forEach((ln, li) => {
        setCurve(ln);
        const alpha = Math.max(st.wt[ln.a], st.wt[ln.b]) * (ln.a === ln.b ? 0.9 : 1);
        for (let k = 0; k < SEG; k++) {
          const o = (li * SEG + k) * 2;
          bez(k / SEG, tmp);
          beamPos[o * 3] = tmp.x;
          beamPos[o * 3 + 1] = tmp.y;
          beamPos[o * 3 + 2] = tmp.z;
          bez((k + 1) / SEG, tmp);
          beamPos[o * 3 + 3] = tmp.x;
          beamPos[o * 3 + 4] = tmp.y;
          beamPos[o * 3 + 5] = tmp.z;
          beamAlpha[o] = beamAlpha[o + 1] = alpha;
        }
        const head = (st.time * 0.32 + ln.seed) % 1;
        bez(head, tmp);
        headPos[li * 3] = tmp.x;
        headPos[li * 3 + 1] = tmp.y;
        headPos[li * 3 + 2] = tmp.z;
        headAlpha[li] = alpha * Math.min(1, head * 8, (1 - head) * 8);
      });
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      headPosAttr.needsUpdate = true;
      headAlphaAttr.needsUpdate = true;
      headMat.uniforms.uSize.value = 10 * renderer.getPixelRatio() * (st.h / 640);

      renderer.render(scene, camera);

      // hotspots: on each plate's right-hand edge, wherever the stack has turned
      const reach = Math.abs(Math.cos(st.yaw)) * (PW / 2) + Math.abs(Math.sin(st.yaw)) * (PD / 2) + 0.14;
      for (let i = 0; i < 4; i++) {
        const el = spotRefs.current[i];
        if (!el) continue;
        tmp.set(reach, st.y[i], 0).project(camera);
        const x = Math.min((tmp.x * 0.5 + 0.5) * st.w, st.w - (st.w < 560 ? 64 : 150));
        const y = (-tmp.y * 0.5 + 0.5) * st.h;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = String(0.4 + 0.6 * st.wt[i]);
      }

      if (++st.readTick % 6 === 0 && readRef.current) {
        const deg = (((st.yaw * 180) / Math.PI) % 360 + 360) % 360;
        readRef.current.textContent = `YAW ${String(Math.round(deg)).padStart(3, "0")}°  EL ${String(Math.round((st.pitch * 180) / Math.PI)).padStart(2, "0")}°  ${(1 / st.zoom).toFixed(2)}×`;
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      st.raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame(dt, now);
      if (st.visible && !document.hidden && !reduced) st.raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (st.raf || !st.visible || document.hidden) return;
      last = performance.now();
      st.raf = requestAnimationFrame(loop);
    };
    // reduced motion draws on demand: every input asks for a few settling frames
    let settle = 0;
    const kickReduced = () => {
      if (!reduced) return kick();
      if (settle) return;
      settle = requestAnimationFrame((now) => {
        settle = 0;
        frame(1 / 60, now);
      });
    };
    kickRef.current = kickReduced;

    /* ── input ── */
    const setEngaged = (on: boolean) => {
      if (st.engaged === on) return;
      st.engaged = on;
      viewer.toggleAttribute("data-engaged", on);
      // Lenis skips wheel events from inside an element carrying this
      host.toggleAttribute("data-lenis-prevent", on);
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0, t: 0 };
    let pinch0 = 0;
    let zoom0 = 1;
    let lastMove = 0;

    const raycaster = new THREE.Raycaster();
    const pick = (cx: number, cy: number) => {
      const r = host.getBoundingClientRect();
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(plates, false)[0];
      return hit ? (hit.object.userData.layer as number) : null;
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (e.pointerType === "mouse") setEngaged(true);
      host.setPointerCapture?.(e.pointerId);
      st.lastInput = performance.now();
      if (pointers.size === 1) {
        st.dragging = true;
        st.vel = 0;
        downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
        lastMove = performance.now();
      } else if (pointers.size === 2) {
        const [p, q] = [...pointers.values()];
        pinch0 = Math.hypot(p.x - q.x, p.y - q.y);
        zoom0 = st.zoomT;
      }
      kickReduced();
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const now = performance.now();
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;
      st.lastInput = now;
      if (pointers.size === 2) {
        const [p, q] = [...pointers.values()];
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (pinch0 > 0) st.zoomT = THREE.MathUtils.clamp((zoom0 * pinch0) / Math.max(1, dist), 0.6, 1.6);
      } else if (st.dragging) {
        const k = 5.2 / Math.max(320, st.w);
        st.yaw += dx * k;
        const dtm = Math.max(0.008, (now - lastMove) / 1000);
        st.vel = THREE.MathUtils.lerp(st.vel, (dx * k) / dtm, 0.5);
        if (e.pointerType === "mouse") st.pitch = THREE.MathUtils.clamp(st.pitch + dy * 0.004, 0.1, 1.0);
      }
      lastMove = now;
      kickReduced();
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        st.dragging = false;
        if (performance.now() - lastMove > 90) st.vel = 0;
        const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
        if (e.type === "pointerup" && moved < 6 && performance.now() - downAt.t < 450) {
          const i = pick(e.clientX, e.clientY);
          setFocus((f) => (i === null ? null : f === i ? null : i));
        }
      }
      pinch0 = 0;
      kickReduced();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && document.activeElement !== host) setEngaged(false);
    };
    const onWheel = (e: WheelEvent) => {
      // page scroll passes straight through unless the model is engaged; a
      // trackpad pinch (ctrlKey) always zooms the model, never the page
      if (!st.engaged && !e.ctrlKey) return;
      e.preventDefault();
      st.lastInput = performance.now();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      st.zoomT = THREE.MathUtils.clamp(st.zoomT * Math.exp(dy * (e.ctrlKey ? 0.006 : 0.0012)), 0.6, 1.6);
      kickReduced();
    };
    const onKey = (e: KeyboardEvent) => {
      let used = true;
      if (e.key === "ArrowLeft") st.vel -= 1.6;
      else if (e.key === "ArrowRight") st.vel += 1.6;
      else if (e.key === "ArrowUp") st.pitch = Math.min(1.0, st.pitch + 0.08);
      else if (e.key === "ArrowDown") st.pitch = Math.max(0.1, st.pitch - 0.08);
      else if (e.key === "+" || e.key === "=") st.zoomT = Math.max(0.6, st.zoomT * 0.88);
      else if (e.key === "-" || e.key === "_") st.zoomT = Math.min(1.6, st.zoomT / 0.88);
      else if (e.key === "Escape") {
        if (focusRef.current !== null) setFocus(null);
        else {
          setEngaged(false);
          host.blur();
        }
      } else if (/^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        setFocus((f) => (f === i ? null : i));
      } else used = false;
      if (used) {
        e.preventDefault();
        st.lastInput = performance.now();
        if (reduced && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          st.yaw += st.vel * 0.15;
          st.vel = 0;
        }
        kickReduced();
      }
    };
    const onFocus = () => setEngaged(true);
    const onBlur = () => setEngaged(false);

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("keydown", onKey);
    host.addEventListener("focus", onFocus);
    host.addEventListener("blur", onBlur);

    const io = new IntersectionObserver(([en]) => {
      st.visible = en.isIntersecting;
      if (st.visible) kickReduced();
      else if (st.raf) {
        cancelAnimationFrame(st.raf);
        st.raf = 0;
      }
    });
    io.observe(viewer);
    const onVis = () => {
      if (!document.hidden) kickReduced();
    };
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => {
      resize();
      kickReduced();
    });
    ro.observe(host);
    resize();
    viewer.setAttribute("data-ready", "");

    return () => {
      kickRef.current = () => {};
      if (st.raf) cancelAnimationFrame(st.raf);
      if (settle) cancelAnimationFrame(settle);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("focus", onFocus);
      host.removeEventListener("blur", onBlur);
      host.removeAttribute("data-lenis-prevent");
      const geos = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) geos.add(m.geometry);
        const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        ms.forEach((x) => mats.add(x));
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  const cur = focus === null ? null : LAYERS[focus];

  return (
    <section data-rail="Stack" aria-labelledby="ai-stack-title" className="ai-section ai-stack relative z-10">
      <div className="ai-wrap">
        <header className="ai-head">
          <p className="ai-label">
            <b>Fig. 03</b> / The stack
          </p>
          <h2 id="ai-stack-title" className="ai-h2 font-display font-semibold uppercase">
            Four layers.
            <br />
            One system.
          </h2>
          <p className="ai-body ai-head__aside">
            Every engagement builds the same four layers, from the data you already own to the tools your team already
            uses. Turn the model over; open any layer to see what it does.
          </p>
        </header>

        <div ref={viewerRef} className="ai-stack__viewer" data-fallback={fallback ? "" : undefined}>
          <div
            ref={hostRef}
            className="ai-stack__host"
            tabIndex={0}
            role="group"
            aria-roledescription="3D model"
            aria-label="The stack: four layers, data, models, agents and interface. Drag or use the arrow keys to turn it, plus and minus to zoom, numbers 1 to 4 to open a layer."
          />
          {fallback && (
            <svg className="ai-stack__still" viewBox="0 0 400 300" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => {
                const y = 220 - i * 52;
                return (
                  <g key={i}>
                    <path d={`M80 ${y} L200 ${y - 34} L320 ${y} L200 ${y + 34} Z`} className="ai-stack__still-plate" />
                    <circle cx={200} cy={y} r={3.5} className="ai-stack__still-node" />
                  </g>
                );
              })}
            </svg>
          )}
          <span aria-hidden="true" className="ai-stack__tick ai-stack__tick--tl" />
          <span aria-hidden="true" className="ai-stack__tick ai-stack__tick--tr" />
          <span aria-hidden="true" className="ai-stack__tick ai-stack__tick--bl" />
          <span aria-hidden="true" className="ai-stack__tick ai-stack__tick--br" />

          <div className="ai-stack__spots">
            {LAYERS.map((l, i) => (
              <button
                key={l.n}
                ref={(el) => {
                  spotRefs.current[i] = el;
                }}
                type="button"
                className="ai-stack__spot"
                aria-pressed={focus === i}
                aria-label={`Layer ${l.n}, ${l.name}: ${l.sub}`}
                onClick={() => toggle(i)}
              >
                <i aria-hidden="true" className="ai-stack__spot-lead" />
                <span className="ai-stack__spot-n">{l.n}</span>
                <span className="ai-stack__spot-name">{l.name}</span>
              </button>
            ))}
          </div>

          <p className="ai-stack__hud" aria-hidden="true">
            <span className="ai-stack__hint">
              <span className="ai-stack__hint-idle">Drag to turn · Click to engage zoom</span>
              <span className="ai-stack__hint-on">Scroll to zoom · Esc to release</span>
              <span className="ai-stack__hint-touch">Drag to turn · Pinch to zoom</span>
            </span>
            <span ref={readRef} className="ai-stack__read">
              YAW 324°  EL 25°  1.00×
            </span>
          </p>

          <aside className="ai-stack__panel" aria-live="polite">
            {cur ? (
              <div key={cur.n} className="ai-stack__sheet">
                <p className="ai-label">
                  <b>Layer {cur.n}</b> / 04
                </p>
                <h3 className="ai-stack__sheet-title font-display">{cur.name}</h3>
                <p className="ai-stack__sheet-sub">{cur.sub}</p>
                <p className="ai-stack__sheet-body">{cur.body}</p>
                <dl className="ai-stack__spec">
                  {cur.spec.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="ai-stack__nav">
                  <button type="button" onClick={() => setFocus(null)} className="ai-stack__navbtn">
                    All layers
                  </button>
                  <span className="ai-stack__navpair">
                    <button
                      type="button"
                      className="ai-stack__navbtn"
                      aria-label="Layer below"
                      disabled={focus === 0}
                      onClick={() => setFocus((f) => (f === null ? 0 : Math.max(0, f - 1)))}
                    >
                      <ArrowDown size={16} weight="light" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="ai-stack__navbtn"
                      aria-label="Layer above"
                      disabled={focus === 3}
                      onClick={() => setFocus((f) => (f === null ? 3 : Math.min(3, f + 1)))}
                    >
                      <ArrowUp size={16} weight="light" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <div key="all" className="ai-stack__sheet">
                <p className="ai-label">
                  <b>Index</b> / 04 layers
                </p>
                <ol className="ai-stack__index">
                  {[...LAYERS].reverse().map((l) => {
                    const i = Number(l.n) - 1;
                    return (
                      <li key={l.n}>
                        <button type="button" onClick={() => toggle(i)}>
                          <span className="ai-stack__index-n">{l.n}</span>
                          <span className="ai-stack__index-name font-display">{l.name}</span>
                          <span className="ai-stack__index-sub">{l.sub}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>
        </div>

        <p className="ai-figcap">
          <span>
            <b>Fig. 03</b> The stack, exploded. Built bottom-up, used top-down.
          </span>
          <span className="ai-figcap__read">{cur ? `LAYER ${cur.n} OPEN` : "4 LAYERS · LIVE"}</span>
        </p>
      </div>
    </section>
  );
}
