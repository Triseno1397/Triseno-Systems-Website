import * as THREE from "three";
import { makeGlowTexture } from "@/components/world/scene/textures";

/* ─────────────────────────────────────────────────────────────────────────
   THE REACTOR in the Operator's chest: the Triseno mark as the glowing heart
   of him, set into his chest plate the way an arc reactor is. A chrome bezel
   flush with the plate, a dark recess behind it, a ring of energy coils, and
   at the bottom of the recess a glowing core with the mark burning white-hot
   in it. It pulses on its own, flickers faintly, and surges when he draws
   power (the forge, the jets).

   The mark is built from the logo's own proportions (public/icons/
   icon-512.png) in its pixel space. The bezel's outer radius is 1; a few
   thousand triangles, and no light (a light would change the light count and
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
    poly([
      [195, 125],
      [440, 125],
      [424, 143],
      [211, 143],
    ]),
    poly([
      [300, 143],
      [335, 143],
      [335, 385],
      [300, 385],
    ]),
    // the three speed-arcs, nested, sweeping back to the left
    arc(292, 300, 91, 104, 90, 205),
    arc(292, 300, 63, 76, 90, 222),
    arc(292, 300, 35, 48, 90, 250),
    // the hook over the bowl, and the bowl
    arc(350, 300, 86, 100, 90, -8),
    arc(352, 325, 44, 60, 90, -90),
  ];
}

export interface Emblem {
  group: THREE.Group;
  /** power 0..1+ (pulse, surges), t seconds */
  update(t: number, power: number): void;
  dispose(): void;
}

/** radii of the reactor, in its own units (the bezel's outer edge is 1) */
const R = { bezel: 1, lip: 0.82, coils: 0.7, core: 0.6, depth: 0.1 };
const COILS = 10;

export function makeEmblem(): Emblem {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const group = new THREE.Group();

  // the bezel: a chrome ring standing just proud of the plate, its inner lip
  // turning down into the recess
  const bezelGeo = keep(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(R.lip - 0.02, -R.depth),
        new THREE.Vector2(R.lip, -0.02),
        new THREE.Vector2(R.lip + 0.05, 0.05),
        new THREE.Vector2(R.bezel - 0.07, 0.07),
        new THREE.Vector2(R.bezel, 0.02),
        new THREE.Vector2(R.bezel + 0.02, -0.12),
      ],
      48,
    ),
  );
  bezelGeo.rotateX(Math.PI / 2); // the lathe's axis onto z, out of his chest
  const chrome = keep(new THREE.MeshStandardMaterial({ color: "#dfe4ec", metalness: 1, roughness: 0.14, envMapIntensity: 2.4, side: THREE.DoubleSide }));
  const bezel = new THREE.Mesh(bezelGeo, chrome);

  // the recess floor: gunmetal, lit by what sits in it
  const recess = new THREE.Mesh(
    keep(new THREE.CircleGeometry(R.lip, 48)),
    keep(new THREE.MeshStandardMaterial({ color: "#1c2027", metalness: 0.85, roughness: 0.35, envMapIntensity: 1 })),
  );
  recess.position.z = -R.depth;

  // the coils: ten blocks round the core, lit, with dark gaps between them
  const coilMat = keep(new THREE.MeshBasicMaterial({ color: "#9fd6ff", toneMapped: false }));
  const coilGeo = keep(new THREE.BoxGeometry(0.2, 0.08, 0.05));
  const coils = new THREE.Group();
  for (let i = 0; i < COILS; i++) {
    const a = (i / COILS) * Math.PI * 2 + Math.PI / COILS;
    const c = new THREE.Mesh(coilGeo, coilMat);
    c.position.set(Math.cos(a) * R.coils, Math.sin(a) * R.coils, -R.depth + 0.03);
    c.rotation.z = a + Math.PI / 2;
    coils.add(c);
  }

  // the core: a disc of light, deep blue at its rim to cyan inward, with a
  // slow ripple running out through it
  const core = keep(
    new THREE.ShaderMaterial({
      toneMapped: false,
      uniforms: { uPower: { value: 1 }, uTime: { value: 0 } },
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
          float r = length(vP) / ${R.core.toFixed(2)};
          float ripple = 0.5 + 0.5 * sin(r * 18.0 - uTime * 3.0);
          vec3 rim = vec3(0.12, 0.42, 1.0);
          vec3 mid = vec3(0.45, 0.82, 1.0);
          vec3 c = mix(mid, rim, smoothstep(0.2, 1.0, r));
          c *= (0.75 + 0.25 * ripple * (1.0 - r)) * (0.55 + 0.6 * uPower);
          // a bright ring at the core's edge, where it meets the coils
          c += vec3(0.5, 0.8, 1.0) * smoothstep(0.86, 0.98, r) * (1.0 - smoothstep(0.98, 1.0, r)) * uPower;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    }),
  );
  const disc = new THREE.Mesh(keep(new THREE.CircleGeometry(R.core, 48)), core);
  disc.position.z = -R.depth + 0.02;

  // the mark: white-hot, just off the core
  const markGeo = keep(new THREE.ShapeGeometry(markShapes(), 16));
  markGeo.scale(0.84, 0.84, 1);
  const markMat = keep(new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const mark = new THREE.Mesh(markGeo, markMat);
  mark.position.z = -R.depth + 0.05;

  // the glow it throws onto his plate and into the air in front of it
  const glowTex = keep(makeGlowTexture());
  const haloMat = keep(
    new THREE.MeshBasicMaterial({ map: glowTex, color: "#6fb8ff", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.4, 3.4)), haloMat);
  halo.position.z = 0.03;
  halo.renderOrder = 17;

  group.add(bezel, recess, coils, disc, mark, halo);
  const none = () => {};
  group.traverse((o) => ((o as THREE.Mesh).raycast = none));

  const coilBase = new THREE.Color("#9fd6ff");
  const markBase = new THREE.Color("#ffffff");
  return {
    group,
    update(t, power) {
      // a faint electrical flicker on top of the pulse
      const flick = 1 + 0.035 * Math.sin(t * 41) * Math.sin(t * 17.3);
      const p = power * flick;
      core.uniforms.uPower.value = p;
      core.uniforms.uTime.value = t;
      coilMat.color.copy(coilBase).multiplyScalar(0.7 + 0.7 * p);
      markMat.color.copy(markBase).multiplyScalar(1.1 + 0.9 * p);
      haloMat.opacity = 0.22 + 0.34 * p;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
