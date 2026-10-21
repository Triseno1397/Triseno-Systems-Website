/* ─────────────────────────────────────────────────────────────────────────
   prismLens — the crystal room seen through a lens you stand inside.

   The frame scrubber draws the film onto a 2D canvas as usual; this samples
   that canvas as a texture and draws it again through one fragment shader:

   - a dolly: the camera pushes down the corridor as the pin plays (uZoom)
   - parallax: the pointer swings the view a little, eased, so the room
     answers the hand (uPtr)
   - a barrel lens with mirror-repeat edges, so the walls fold into crystal
     facets instead of ending
   - dispersion: every pixel is sampled seven times along its radius and
     weighted red to violet, so bright edges split into spectra; the split
     opens with scroll speed (uVel)
   - a refraction ripple that rolls out from the vanishing point each time
     a deliverable lands (pulse())
   - a soft bloom on the highlights, a vignette and a fine grain

   Desktop only (the page decides): iOS kills tabs that hold big GPU layers.
   It renders only while the section is on screen, and re-uploads the
   texture only when the scrubber has drawn a new frame.
   ───────────────────────────────────────────────────────────────────────── */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uZoom;
uniform vec2 uPtr;
uniform float uVel;
uniform float uPulse;
uniform vec3 uPulseHue;

vec2 mirror(vec2 uv) { return 1.0 - abs(1.0 - mod(uv, 2.0)); }

vec3 spectrum(float t) {
  // red to violet, roughly equal energy
  return clamp(vec3(
    1.5 - abs(t * 4.0 - 0.5),
    1.5 - abs(t * 4.0 - 2.0),
    1.5 - abs(t * 4.0 - 3.5)
  ), 0.0, 1.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 c = vUv - 0.5;
  c.x *= aspect;

  // the hand swings the view; the dolly pushes in
  c -= uPtr * vec2(0.045, 0.03);
  c /= uZoom;

  // barrel lens: the walls lean in toward you
  float r2 = dot(c, c);
  c *= 1.0 + 0.16 * r2;

  // the ripple: one ring rolling out from the vanishing point
  float r = length(c);
  float front = uPulse * 1.35;
  float ring = exp(-pow((r - front) * 7.0, 2.0)) * (1.0 - uPulse);
  vec2 n = c / max(r, 1e-4);
  c += n * ring * 0.035 * sin((r - front) * 60.0);

  // dispersion along the radius: a calm prism at rest, wide when moving
  float spread = 0.006 + r * 0.018 + uVel * 0.05 + ring * 0.07;
  vec3 col = vec3(0.0);
  vec3 wsum = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float t = float(i) / 6.0;
    vec2 q = c * (1.0 + (t - 0.5) * spread);
    q.x /= aspect;
    vec3 w = spectrum(t);
    col += texture2D(uTex, mirror(q + 0.5)).rgb * w;
    wsum += w;
  }
  col /= wsum;

  // bloom: a wide, cheap blur of the highlights only
  vec2 cu = c;
  cu.x /= aspect;
  vec2 uv = mirror(cu + 0.5);
  vec3 glow = vec3(0.0);
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.785398 + uTime * 0.05;
    vec2 o = vec2(cos(a), sin(a)) * 0.012;
    vec3 s = texture2D(uTex, mirror(uv + o)).rgb + texture2D(uTex, mirror(uv + o * 2.6)).rgb;
    glow += max(s - 0.62, 0.0);
  }
  col += glow * 0.07;
  // a touch of contrast, so the light reads as light and not as white paper
  col = pow(col, vec3(1.12)) * 0.94;

  // the ring carries the colour of the band that just landed
  col += uPulseHue * ring * 0.22;

  // vignette and grain
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.85;
  col += (hash(vUv * uRes + uTime) - 0.5) * 0.028;

  gl_FragColor = vec4(col, 1.0);
}`;

export interface PrismLens {
  /** the source canvas changed; upload it before the next draw */
  dirty(): void;
  /** 0..1 progress of the pin, drives the dolly */
  setProgress(p: number): void;
  /** scroll speed, any unit; it is normalised and eased here */
  setVelocity(v: number): void;
  /** roll a ripple out from the centre in the given colour */
  pulse(hex: string): void;
  /** only draw while true */
  setActive(on: boolean): void;
  resize(): void;
  dispose(): void;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createPrismLens(out: HTMLCanvasElement, src: HTMLCanvasElement): PrismLens | null {
  const gl = out.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;

  const compile = (type: number, code: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, code);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u("uRes");
  const uTime = u("uTime");
  const uZoom = u("uZoom");
  const uPtr = u("uPtr");
  const uVel = u("uVel");
  const uPulse = u("uPulse");
  const uPulseHue = u("uPulseHue");

  let needsUpload = true;
  let active = false;
  let raf = 0;
  let disposed = false;
  let progress = 0;
  let velTarget = 0;
  let vel = 0;
  let pulseAt = -1e9;
  let hue: [number, number, number] = [1, 1, 1];
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const t0 = performance.now();

  const onMove = (e: PointerEvent) => {
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  function resize() {
    const r = out.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (out.width !== w || out.height !== h) {
      out.width = w;
      out.height = h;
    }
    gl!.viewport(0, 0, w, h);
  }

  function frame(now: number) {
    raf = 0;
    if (disposed || !active) return;
    if (needsUpload && src.width > 1) {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, src);
      needsUpload = false;
    }
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;
    vel += (velTarget - vel) * 0.08;
    velTarget *= 0.9;
    const t = (now - t0) / 1000;
    const pulse = Math.min(1, (now - pulseAt) / 1500);
    // the dolly: a slow push the whole way down, breathing a touch at rest
    const zoom = 1.02 + progress * 0.3 + Math.sin(t * 0.6) * 0.006;

    gl!.uniform2f(uRes, out.width, out.height);
    gl!.uniform1f(uTime, t);
    gl!.uniform1f(uZoom, zoom);
    gl!.uniform2f(uPtr, ptr.x, ptr.y);
    gl!.uniform1f(uVel, Math.min(1, vel));
    gl!.uniform1f(uPulse, pulse);
    gl!.uniform3f(uPulseHue, hue[0], hue[1], hue[2]);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  }

  resize();

  return {
    dirty() {
      needsUpload = true;
    },
    setProgress(p) {
      progress = p;
    },
    setVelocity(v) {
      velTarget = Math.max(velTarget, Math.min(1, Math.abs(v) / 4000));
    },
    pulse(hex) {
      hue = hexRgb(hex);
      pulseAt = performance.now();
    },
    setActive(on) {
      active = on;
      if (on && !raf) raf = requestAnimationFrame(frame);
    },
    resize,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
