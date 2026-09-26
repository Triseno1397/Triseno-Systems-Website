import * as THREE from "three";
import { makeGlowTexture } from "@/components/world/scene/textures";

/* ─────────────────────────────────────────────────────────────────────────
   THE ORB in the Operator's chest: the Triseno mark, machined in chrome,
   standing in a lens of blue light set into his chest plate — the size of
   the round medallion painted on him. The light pulses on its own, flickers
   faintly and surges when he draws power (the forge, the jets); a band of
   light sweeps across the mark every few seconds and every edge of it is lit
   ice-blue.

   The mark is built from the logo's own proportions (public/icons/
   icon-512.png) in its pixel space. The orb's radius is 1; a few thousand
   triangles and no light (a light would change the light count and
   recompile every shader in the world).
   ───────────────────────────────────────────────────────────────────────── */

const CX = 318;
const CY = 255;
/** logo pixels -> emblem units: the mark is ~1 unit across */
const K = 1 / 290;

/** the logo is drawn y-down; the emblem is y-up, centred on the mark */
const P = (x: number, y: number) => new THREE.Vector2((x - CX) * K, (CY - y) * K);

function poly(pts: [number, number][]) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const v = P(x, y);
    if (i === 0) s.moveTo(v.x, v.y);
    else s.lineTo(v.x, v.y);
  });
  s.closePath();
  return s;
}

/** a ring sector (a curved stroke), angles in degrees, y-up, from a0 to a1 */
function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const c = P(cx, cy);
  const d = Math.PI / 180;
  const s = new THREE.Shape();
  const cw = a1 < a0;
  s.moveTo(c.x + Math.cos(a0 * d) * r1 * K, c.y + Math.sin(a0 * d) * r1 * K);
  s.absarc(c.x, c.y, r1 * K, a0 * d, a1 * d, cw);
  s.lineTo(c.x + Math.cos(a1 * d) * r0 * K, c.y + Math.sin(a1 * d) * r0 * K);
  s.absarc(c.x, c.y, r0 * K, a1 * d, a0 * d, !cw);
  s.closePath();
  return s;
}

function markShapes(): THREE.Shape[] {
  return [
    // the T: a chamfered bar and its stem
    // (strokes fattened over the logo's: at the size of a medallion on his
    // chest, thin strokes read as scratches)
    poly([
      [188, 118],
      [447, 118],
      [426, 148],
      [209, 148],
    ]),
    poly([
      [296, 148],
      [339, 148],
      [339, 385],
      [296, 385],
    ]),
    // the three speed-arcs, nested, sweeping back to the left
    arc(292, 300, 88, 108, 90, 205),
    arc(292, 300, 60, 80, 90, 222),
    arc(292, 300, 32, 52, 90, 250),
    // the hook over the bowl, and the bowl
    arc(350, 300, 82, 104, 90, -8),
    arc(352, 325, 40, 62, 90, -90),
  ];
}

export interface Emblem {
  group: THREE.Group;
  /** power 0..1+ (pulse, surges), t seconds */
  update(t: number, power: number): void;
  dispose(): void;
}

/** the orb's radius is 1; the mark's width inside it */
const MARK = 0.78;

export function makeEmblem(): Emblem {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const group = new THREE.Group();

  // the orb: a lens of blue light set into the plate — deep blue at the rim,
  // cyan inward, a slow ripple running out through it, a bright ring at the
  // edge where it meets the bezel
  const uPower = { value: 0.8 };
  const uTime = { value: 0 };
  const lens = keep(
    new THREE.ShaderMaterial({
      toneMapped: false,
      uniforms: { uPower, uTime },
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() {
          vP = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uPower;
        uniform float uTime;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float ripple = 0.5 + 0.5 * sin(r * 16.0 - uTime * 2.8);
          vec3 rim = vec3(0.1, 0.36, 1.0);
          vec3 mid = vec3(0.4, 0.8, 1.0);
          vec3 c = mix(mid, rim, smoothstep(0.15, 1.0, r));
          c *= (0.7 + 0.3 * ripple * (1.0 - r)) * (0.38 + 0.5 * uPower);
          c += vec3(0.55, 0.85, 1.0) * smoothstep(0.84, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r)) * uPower;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    }),
  );
  const orb = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 56)), lens);
  orb.position.z = -0.03;

  // the bezel: a slim chrome ring standing proud of the plate round the lens,
  // its inner edge turning down to the lens — what seats it into him
  const bezelGeo = keep(
    new THREE.LatheGeometry(
      [new THREE.Vector2(0.96, -0.03), new THREE.Vector2(1.0, 0.05), new THREE.Vector2(1.1, 0.06), new THREE.Vector2(1.16, 0.0), new THREE.Vector2(1.17, -0.12)],
      56,
    ),
  );
  bezelGeo.rotateX(Math.PI / 2);
  const bezel = new THREE.Mesh(bezelGeo, keep(new THREE.MeshStandardMaterial({ color: "#dfe4ec", metalness: 1, roughness: 0.14, envMapIntensity: 2.4, side: THREE.DoubleSide })));

  // the mark: machined chrome standing in the light, a band of light sweeping
  // across its face every few seconds, every edge lit ice-blue
  const geo = keep(
    new THREE.ExtrudeGeometry(markShapes(), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 20,
    }),
  );
  geo.scale(MARK, MARK, 1);
  geo.translate(0, 0, -0.03); // its back in the lens, its face just proud of the bezel
  geo.computeVertexNormals();
  const uSweep = { value: -9 };
  const face = keep(
    new THREE.MeshStandardMaterial({ color: "#eef2f7", metalness: 1, roughness: 0.2, envMapIntensity: 1.4, emissive: "#ffffff", emissiveIntensity: 1 }),
  );
  face.onBeforeCompile = (sh) => {
    sh.uniforms.uPower = uPower;
    sh.uniforms.uSweep = uSweep;
    sh.vertexShader = "varying vec2 vEP;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvEP = position.xy;");
    sh.fragmentShader =
      "uniform float uPower;\nuniform float uSweep;\nvarying vec2 vEP;\n" +
      sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float band = smoothstep(0.07, 0.0, abs(vEP.x * 0.8 + vEP.y * 0.6 - uSweep));
        totalEmissiveRadiance = vec3(0.94, 0.97, 1.0) * (0.55 + 0.45 * uPower) + vec3(1.0, 1.04, 1.1) * band * 1.6;`,
      );
  };
  face.customProgramCacheKey = () => "triseno-emblem-face";
  const edge = keep(new THREE.MeshBasicMaterial({ color: "#dff0ff", toneMapped: false }));
  const edgeBase = new THREE.Color("#dff0ff");
  // ExtrudeGeometry: group 0 = the caps (face and back), group 1 = the sides
  const mark = new THREE.Mesh(geo, [face, edge]);

  // the glow it throws onto his plate and into the air in front of it
  const glowTex = keep(makeGlowTexture());
  const haloMat = keep(
    new THREE.MeshBasicMaterial({ map: glowTex, color: "#6fb8ff", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  // (behind the mark, so its light never tints the chrome)
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.6, 3.6)), haloMat);
  halo.position.z = -0.02;
  halo.renderOrder = 15;

  group.add(orb, bezel, mark, halo);
  const none = () => {};
  group.traverse((o) => ((o as THREE.Mesh).raycast = none));

  return {
    group,
    update(t, power) {
      // a faint electrical flicker on top of the pulse
      const flick = 1 + 0.035 * Math.sin(t * 41) * Math.sin(t * 17.3);
      const p = power * flick;
      uPower.value = p;
      uTime.value = t;
      // a sweep across the mark every 4.5s, crossing in 0.8s
      const c = t % 4.5;
      uSweep.value = c < 0.8 ? -0.75 + (c / 0.8) * 1.5 : -9;
      edge.color.copy(edgeBase).multiplyScalar(0.6 + 0.8 * p);
      haloMat.opacity = 0.2 + 0.32 * p;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
