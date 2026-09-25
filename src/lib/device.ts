/* ─────────────────────────────────────────────────────────────────────────
   WHAT THIS MACHINE CAN CARRY — read once, before any 3D is built.

   The site has to run smoothly on a five-year-old laptop and a three-year-old
   phone, not only on the machine it was built on. So nothing starts at the
   top quality and waits to be caught stuttering: a weak machine starts where
   it will be smooth, and the runtime monitor (PortalScene / DivisionWorldScene)
   only ever has small steps left to take.

   Signals, cheapest first:
   · CPU cores and device memory (Chromium reports memory; others do not, and
     are judged on cores alone);
   · the visitor asked to save data;
   · the GPU's own name, read off the real canvas once it exists (never a
     throwaway context — creating one is the tab's whole GPU start-up).
   ───────────────────────────────────────────────────────────────────────── */

export type DeviceClass = "high" | "mid" | "low";
export type GpuClass = "software" | "weak" | "ok";

let cached: DeviceClass | null = null;

export function deviceClass(): DeviceClass {
  if (cached) return cached;
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory;
  const save = !!nav.connection?.saveData;
  // ?dev=low|mid|high forces a class, for checking the fallbacks on a fast machine
  const force = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("dev") : null;
  if (force === "low" || force === "mid" || force === "high") cached = force;
  else if (save || cores <= 2 || (mem !== undefined && mem <= 2)) cached = "low";
  else if (cores <= 4 || (mem !== undefined && mem <= 4)) cached = "mid";
  else cached = "high";
  return cached;
}

/** The GPU's name, from the context the page actually draws with. */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(name || "");
  } catch {
    return "";
  }
}

/**
 * software: no GPU at all (hardware acceleration off, a blocklisted driver,
 *   a remote desktop) — WebGL is being drawn by the CPU and no 3D scene of
 *   this size is ever smooth there.
 * weak: integrated graphics of the last decade and entry-level mobile GPUs —
 *   the world runs, at a lower resolution and with fewer passes.
 */
export function gpuClass(name: string): GpuClass {
  if (typeof window !== "undefined") {
    const force = new URLSearchParams(window.location.search).get("gpu");
    if (force === "software" || force === "weak" || force === "ok") return force;
  }
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|microsoft basic render/.test(n)) return "software";
  if (
    /intel.*\b(u?hd|gma|iris\(tm\) graphics [0-9]{3})\b/.test(n) || // Intel HD / UHD / older Iris
    /mali-[gt]?[0-9]{1,2}\b/.test(n) || // older Mali
    /adreno.*\b[3-5][0-9]{2}\b/.test(n) || // Adreno 3xx-5xx
    /powervr|videocore|tegra/.test(n) ||
    /geforce (mx ?[0-9]{2,3}|gt ?[0-9]{3,4}|9[0-9]{2}m)\b/.test(n) || // entry laptop NVIDIA
    /radeon (r[2-7] |hd [0-9]{4}|vega [3-8]\b)/.test(n) // older / small Radeon
  )
    return "weak";
  return "ok";
}

/** Lowest-effort check that the page should not try 3D at all. */
export function prefersLite(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof WebGL2RenderingContext === "undefined" && typeof WebGLRenderingContext === "undefined") return true;
  return deviceClass() === "low" && window.matchMedia("(pointer: coarse)").matches;
}
