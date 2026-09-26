import * as THREE from "three";
import { makeGlowTexture } from "@/components/world/scene/textures";

/* ─────────────────────────────────────────────────────────────────────────
   THE EMBLEM on the Operator's chest: the Triseno mark as a machined part of
   him rather than paint. A chrome T with the three speed-arcs and the
   hooked bowl, extruded with a bevel; its face is a lit panel that breathes,
   a band of light sweeps across it every few seconds, and a soft halo sits
   behind it. It surges when he draws power — the forge, the jets.

   Built from the logo's own proportions (public/icons/icon-512.png), in its
   pixel space, then brought down to a unit across. A few thousand triangles,
   three materials, no light (a light would change the light count and
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
  /** power 0..1+ (breathing, surges), t seconds */
  update(t: number, power: number): void;
  dispose(): void;
}

export function makeEmblem(): Emblem {
  const geo = new THREE.ExtrudeGeometry(markShapes(), {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 20,
  });
  geo.translate(0, 0, -0.05); // the face at z = 0.012 (bevel), the back sunk into him
  geo.computeVertexNormals();

  // the face: mirror chrome, like the logo's own steel, with a faint cold
  // light in it that breathes, and a band of light sweeping across
  const uPower = { value: 0.8 };
  const uSweep = { value: -9 };
  const face = new THREE.MeshStandardMaterial({
    color: "#e6ebf2",
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: 2.6,
    emissive: "#ffffff",
    emissiveIntensity: 1,
  });
  face.onBeforeCompile = (sh) => {
    sh.uniforms.uPower = uPower;
    sh.uniforms.uSweep = uSweep;
    sh.vertexShader = "varying vec2 vEP;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvEP = position.xy;");
    sh.fragmentShader =
      "uniform float uPower;\nuniform float uSweep;\nvarying vec2 vEP;\n" +
      sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float band = smoothstep(0.08, 0.0, abs(vEP.x * 0.8 + vEP.y * 0.6 - uSweep));
        totalEmissiveRadiance = vec3(0.55, 0.66, 0.82) * 0.42 * uPower + vec3(1.0, 1.04, 1.1) * band * 1.8;`,
      );
  };
  face.customProgramCacheKey = () => "triseno-emblem-face";
  // the bevels and sides: a cold blue light running round every edge of the mark
  const edge = new THREE.MeshBasicMaterial({ color: "#8cc8ff", toneMapped: false });
  const edgeBase = new THREE.Color("#8cc8ff");
  // ExtrudeGeometry: group 0 = the caps (face and back), group 1 = the sides
  const mesh = new THREE.Mesh(geo, [face, edge]);

  // the halo behind it
  const glow = makeGlowTexture();
  const haloMat = new THREE.MeshBasicMaterial({
    map: glow,
    color: "#8cc6ff",
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), haloMat);
  halo.position.z = 0; // on the plate around the mark, behind its face
  halo.renderOrder = 17;

  const group = new THREE.Group();
  group.add(mesh, halo);
  const none = () => {};
  mesh.raycast = none;
  halo.raycast = none;

  return {
    group,
    update(t, power) {
      uPower.value = power;
      // a sweep every 4.5s, crossing in 0.8s
      const c = t % 4.5;
      uSweep.value = c < 0.8 ? -0.9 + (c / 0.8) * 1.8 : -9;
      edge.color.copy(edgeBase).multiplyScalar(0.55 + 0.75 * power);
      haloMat.opacity = 0.12 + 0.22 * power;
    },
    dispose() {
      geo.dispose();
      face.dispose();
      edge.dispose();
      haloMat.dispose();
      glow.dispose();
      halo.geometry.dispose();
    },
  };
}
