import * as THREE from "three";
import { makeGlowTexture } from "@/components/world/scene/textures";

/* ─────────────────────────────────────────────────────────────────────────
   THE REACTOR in the Operator's chest: the Triseno mark as the glowing heart
   of him, set into his chest plate the way an arc reactor is. The face is a
   rendered reactor (a chrome bezel, ten coils of blue plasma, a lit core) on
   a disc, seated into the plate by a slim chrome rim; its light pulses on its
   own, flickers faintly, and surges when he draws power (the forge, the
   jets). The mark burns white-hot in the core, drawn in code from the logo's
   own proportions (public/icons/icon-512.png) so it stays exact.

   The reactor's radius is 1; a few hundred triangles, one texture, and no
   light (a light would change the light count and recompile every shader in
   the world).
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

/** the rendered face of the reactor (design-loop/art-src/reactor: a GPT
 *  Image 2.5 render, cut to a circle with alpha outside it) */
const FACE = "/models/reactor-face.webp";
/** the reactor's radius is 1; the mark fits the core at its centre */
const MARK = 0.44;

export function makeEmblem(): Emblem {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const group = new THREE.Group();

  // the face: the render, on a disc, its lit parts pulsing. The render is
  // sampled by how blue a pixel is, so the plasma and the coils breathe and
  // surge while the chrome bezel between them stays still.
  const tex = keep(new THREE.TextureLoader().load(FACE));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = keep(
    new THREE.ShaderMaterial({
      toneMapped: false,
      transparent: true,
      uniforms: { uMap: { value: tex }, uPower: { value: 1 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uPower;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          // how much of this pixel is light rather than metal
          float lit = clamp((t.b - t.r) * 1.6 + (t.b - 0.55), 0.0, 1.0);
          float r = length(vUv - 0.5) * 2.0;
          // a slow ripple running out from the core through the light
          float ripple = 0.5 + 0.5 * sin(r * 14.0 - uTime * 2.6);
          float gain = mix(1.0, 0.55 + 0.75 * uPower + 0.12 * ripple, lit);
          gl_FragColor = vec4(t.rgb * gain, t.a);
        }
      `,
    }),
  );
  const disc = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 64)), face);

  // a slim chrome rim standing proud of the plate around the face, its inner
  // edge turning down to meet the render's own bezel: what seats it into him
  const rimGeo = keep(
    new THREE.LatheGeometry(
      [new THREE.Vector2(0.96, -0.02), new THREE.Vector2(0.99, 0.04), new THREE.Vector2(1.05, 0.045), new THREE.Vector2(1.08, 0.0), new THREE.Vector2(1.09, -0.1)],
      64,
    ),
  );
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, keep(new THREE.MeshStandardMaterial({ color: "#dfe4ec", metalness: 1, roughness: 0.14, envMapIntensity: 2.4, side: THREE.DoubleSide })));

  // the mark: white-hot in the core
  const markGeo = keep(new THREE.ShapeGeometry(markShapes(), 16));
  markGeo.scale(MARK, MARK, 1);
  const markMat = keep(new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const mark = new THREE.Mesh(markGeo, markMat);
  mark.position.z = 0.012;
  // and its own bloom, so it burns rather than sits
  const glowTex = keep(makeGlowTexture());
  const markGlowMat = keep(
    new THREE.MeshBasicMaterial({ map: glowTex, color: "#dff1ff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  const markGlow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 1.5)), markGlowMat);
  markGlow.position.z = 0.008;
  markGlow.renderOrder = 16;

  // the glow it throws onto his plate and into the air in front of it
  const haloMat = keep(
    new THREE.MeshBasicMaterial({ map: glowTex, color: "#6fb8ff", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.4, 3.4)), haloMat);
  halo.position.z = 0.03;
  halo.renderOrder = 17;

  group.add(disc, rim, markGlow, mark, halo);
  const none = () => {};
  group.traverse((o) => ((o as THREE.Mesh).raycast = none));

  const markBase = new THREE.Color("#ffffff");
  return {
    group,
    update(t, power) {
      // a faint electrical flicker on top of the pulse
      const flick = 1 + 0.035 * Math.sin(t * 41) * Math.sin(t * 17.3);
      const p = power * flick;
      face.uniforms.uPower.value = p;
      face.uniforms.uTime.value = t;
      markMat.color.copy(markBase).multiplyScalar(1.2 + 0.8 * p);
      markGlowMat.opacity = 0.3 + 0.4 * p;
      haloMat.opacity = 0.22 + 0.34 * p;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
