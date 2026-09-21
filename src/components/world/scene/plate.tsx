"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { plate as plateFor, type PlateWorld } from "../plates";
import { env } from "./env";

/* ─────────────────────────────────────────────────────────────────────────
   The world plate as the deep background INSIDE the 3D scene.

   A full-screen quad drawn first, behind everything, with no depth. Because it
   is part of the scene the glass refracts and reflects it, so the real-time
   foreground and the painted place are one image, not a canvas over a photo.

   The shader brings the still plate to life:
   · cover-fit with the plate's horizon pinned to the screen horizon the 3D
     camera is lens-shifted to, so objects stand on the plate's floor;
   · a slow scroll-driven push-in (scale 1.00 → 1.12 about the vanishing point)
     and a few pixels of pointer parallax;
   · a soft light that follows the pointer;
   · the plate's light shaft breathing, and a low haze drifting over the floor;
   · a colour grade: the achromatic plate takes the focused division's hue
     (luminance kept, hue and saturation from the division), and a pool of that
     hue spills onto the floor under the focal object. At rest it is colourless.
   ───────────────────────────────────────────────────────────────────────── */

const VERT = /* glsl */ `
  varying vec2 vS;
  void main() {
    vS = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5); // screen uv, y down
    gl_Position = vec4(position.xy, 0.99999, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uBlur;
  uniform vec4 uA;          // x time, y view aspect, z ready (0..1), w zoom
  uniform vec4 uB;          // x tint, y horizon, z image aspect
  uniform vec2 uShift;
  uniform vec2 uPointer;
  uniform vec3 uHue;
  uniform vec3 uPool;       // xy = screen uv of the focal floor point, z = strength
  varying vec2 vS;

  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    float uTime = uA.x;
    float uViewAspect = uA.y;
    float uReady = uA.z;
    float uZoom = uA.w;
    float uTint = uB.x;
    float uHorizon = uB.y;
    float uImgAspect = uB.z;
    vec2 s = vS;
    vec2 anchor = vec2(0.5, uHorizon);
    // cover-fit, horizon of the plate held at the same screen height
    vec2 uv = s;
    if (uViewAspect < uImgAspect) uv.x = 0.5 + (s.x - 0.5) * (uViewAspect / uImgAspect);
    else uv.y = uHorizon + (s.y - uHorizon) * (uImgAspect / uViewAspect);
    // push-in about the vanishing point + parallax
    uv = anchor + (uv - anchor) / uZoom + uShift;
    uv = clamp(uv, vec2(0.001), vec2(0.999));
    vec2 tuv = vec2(uv.x, 1.0 - uv.y);

    vec3 c = mix(texture2D(uBlur, tuv).rgb, texture2D(uMap, tuv).rgb, uReady);

    // the shaft breathes
    float shaft = exp(-pow((uv.x - 0.5) / 0.07, 2.0)) * smoothstep(uHorizon + 0.02, 0.0, uv.y);
    c += c * shaft * (0.1 + 0.1 * sin(uTime * 0.7));

    // low haze drifting across the floor line
    float band = exp(-pow((s.y - uHorizon) / 0.07, 2.0));
    float drift = 0.5 + 0.5 * sin(s.x * 5.0 + uTime * 0.11) * sin(s.x * 2.3 - uTime * 0.07 + 1.3);
    c += vec3(0.022) * band * drift;

    // colour grade: keep the plate's light, take the division's hue
    float l = lum(c);
    // (scaled by the hue's peak channel, not its luminance, so bright stone
    // keeps its texture instead of clipping into a flat band of hue)
    vec3 graded = l * uHue * 1.3;
    c = mix(c, graded, uTint);

    // a pool of the focal light on the wet floor under the object
    vec2 dp = (s - uPool.xy) * vec2(uViewAspect, 1.0);
    float pool = exp(-(pow(dp.x / 0.34, 2.0) + pow(dp.y / 0.05, 2.0))) * step(uHorizon, s.y);
    c += uHue * pool * uPool.z;

    // a soft light that follows the pointer
    vec2 dl = (s - uPointer) * vec2(uViewAspect, 1.0);
    c += mix(vec3(1.0), uHue, uTint) * 0.045 * exp(-dot(dl, dl) / 0.05);

    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function loadTexture(url: string, onLoad?: () => void): THREE.Texture {
  const t = new THREE.TextureLoader().load(url, () => onLoad?.());
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

export interface PlateBackdropProps {
  world: PlateWorld;
  /** normalised pointer (-1..1) for parallax and the pointer light */
  pointer: () => [number, number];
  /** strength of the hue pool under env.focus (0 disables) */
  pool?: number;
  /** how strongly the env hue grades the plate (0 for plates painted in their hue) */
  grade?: number;
}

export function PlateBackdrop({ world, pointer, pool = 0.16, grade = 0.82 }: PlateBackdropProps) {
  const { size, camera } = useThree();
  const p = plateFor(world);
  // material and textures are built together: the blur placeholder is a data
  // URL and paints at once; the real plate fades in over it when it arrives
  const world3 = useMemo(() => {
    const ready = { v: false };
    const map = loadTexture(p.desktop, () => (ready.v = true));
    // placeholder: the plate's own pre-blurred glass copy (true colour; the
    // manifest's 24px blurs carry chroma noise)
    const blur = loadTexture(p.desktopGlass);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
      uniforms: {
        uMap: { value: map },
        uBlur: { value: blur },
        uA: { value: new THREE.Vector4(0, 1.6, 0, 1) },
        uB: { value: new THREE.Vector4(0, p.horizon.desktop, 2880 / 1620, 0) },
        uShift: { value: new THREE.Vector2() },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uHue: { value: new THREE.Color(1, 1, 1) },
        uPool: { value: new THREE.Vector3(0.5, 0.9, 0) },
      },
    });
    // x = eased zoom, y = fade-in of the real plate over its placeholder
    return { mat, map, blur, ready, anim: new THREE.Vector2(1, 0) };
  }, [p.desktop, p.desktopGlass, p.horizon.desktop]);

  useEffect(
    () => () => {
      world3.mat.dispose();
      world3.map.dispose();
      if (world3.blur !== world3.map) world3.blur.dispose();
    },
    [world3],
  );

  const probe = useMemo(() => new THREE.Vector3(), []);
  const hue = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const { mat, ready, anim } = world3;
    const u = mat.uniforms;
    const step = Math.min(dt, 1);
    const fade = ready.v ? Math.min(1, anim.y + step / 0.9) : anim.y;

    // scroll-driven push-in across the whole page
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const prog = Math.min(1, Math.max(0, window.scrollY / max));
    const zoom = anim.x + (1 + 0.12 * prog - anim.x) * (1 - Math.exp(-step * 4));
    anim.set(zoom, fade);
    (u.uA.value as THREE.Vector4).set(state.clock.elapsedTime, size.width / Math.max(1, size.height), fade, zoom);

    const [px, py] = pointer();
    const sh = u.uShift.value as THREE.Vector2;
    const kp = 1 - Math.exp(-step * 3);
    sh.set(sh.x + (px * 0.006 - sh.x) * kp, sh.y + (py * 0.004 - sh.y) * kp);
    (u.uPointer.value as THREE.Vector2).set(0.5 + px * 0.5, 0.5 + py * 0.5);

    // hue: normalised env light; the grade is only ever as strong as the
    // world is chromatic, and dips with the hue swap (never a blend of two)
    hue.copy(env.light);
    const m = Math.max(hue.r, hue.g, hue.b, 1e-4);
    hue.multiplyScalar(1 / m);
    (u.uHue.value as THREE.Color).copy(hue);
    (u.uB.value as THREE.Vector4).setX(grade * env.level * (1 - env.white));

    // pool of light under whatever is in focus
    probe.set(env.focus.x, 0, env.focus.z).project(camera);
    (u.uPool.value as THREE.Vector3).set(
      (probe.x + 1) / 2,
      (1 - probe.y) / 2,
      probe.z < 1 ? pool * (0.35 + 0.65 * (1 - env.white)) : 0,
    );
  });

  return (
    <mesh material={world3.mat} renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
