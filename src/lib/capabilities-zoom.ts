// Capabilities zoom-through — timeline + velocity-smear logic.
//
// Extracted from the section component so the choreography stays readable and
// testable. Two independent transform systems drive the effect and are kept on
// SEPARATE nested elements so they never write to the same transform:
//
//   .cap-layer  ← the scrubbed zoom (scale + opacity + focal transform-origin)
//   .cap-warp   ← the velocity smear (scaleY stretch + skewX + chromatic split)
//
// Everything animated here is transform / opacity / color only — no layout
// properties, no per-frame blur or SVG filters. That is what keeps it pinned at
// 60fps regardless of scroll speed.

import { gsap } from "@/hooks/useGSAPSetup";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitText, type SplitResult } from "@/lib/split-text";

// Theme tokens (mirrors globals.css). Chars resolve from accent → primary as a
// word settles; never hardcode anything outside the palette.
const ACCENT = "#00b4d8"; // --accent-primary / cyan-400
const PRIMARY = "#e8edf5"; // --text-primary

export interface ZoomTimelineOptions {
  /** The element ScrollTrigger pins (the full-viewport stage). */
  pinTarget: HTMLElement;
  /**
   * The scaling elements, one per capability — each tightly wraps its word so
   * `transform-origin` can be expressed relative to the word itself.
   */
  layers: HTMLElement[];
  /** The word element inside each zoom layer (gets char-split). */
  words: HTMLElement[];
  /** Max scale an outgoing word reaches as it flies past the camera. */
  scaleCeiling: number;
  /** Scrub smoothing lag in seconds (small lag reads as premium). */
  scrub: number;
  /**
   * Scroll distance granted per timeline time-unit, in viewports. The total
   * pinned distance is derived from the timeline's real duration × this, so the
   * scroll budget always matches the choreography (no dead "nothing happens"
   * scroll zone).
   */
  viewportsPerUnit: number;
  /** Called as the active capability index changes (for captions / dots). */
  onActiveChange: (index: number) => void;
}

export interface ZoomTimelineHandle {
  /** Reverts the GSAP timeline and restores split words to plain text. */
  destroy: () => void;
  /** The pin/scrub ScrollTrigger driving the zoom (for velocity queries). */
  scrollTrigger: ScrollTrigger;
}

/**
 * Compute a `transform-origin` near a focal letter so the camera flies INTO a
 * letter rather than the dead center of the word. We pick the character closest
 * to ~35% of the word's width and return its center as a percentage of the
 * scaling element's own box, so the value stays correct after resizes when
 * recomputed on ScrollTrigger refresh.
 */
function focalOrigin(scaleEl: HTMLElement, chars: HTMLElement[]): string {
  if (chars.length === 0) return "38% 48%";
  const box = scaleEl.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return "38% 48%";

  const targetX = box.left + box.width * 0.35;
  let focal = chars[0];
  let best = Infinity;
  for (const ch of chars) {
    const r = ch.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const dist = Math.abs(cx - targetX);
    if (dist < best) {
      best = dist;
      focal = ch;
    }
  }
  const fr = focal.getBoundingClientRect();
  const ox = ((fr.left + fr.width / 2 - box.left) / box.width) * 100;
  const oy = ((fr.top + fr.height / 2 - box.top) / box.height) * 100;
  return `${ox.toFixed(2)}% ${oy.toFixed(2)}%`;
}

/**
 * Build the pinned, scrubbed zoom-through timeline. One scroll "unit" (= one
 * viewport) is spent per capability: the word holds settled and crisp, then
 * flies into its focal letter and fades while the next word emerges from depth
 * and assembles. The first word opens settled; the last word stays settled to
 * the end so the pin releases on a readable frame (no empty pinned screen).
 */
export function createZoomTimeline(
  options: ZoomTimelineOptions
): ZoomTimelineHandle {
  const {
    pinTarget,
    layers,
    words,
    scaleCeiling,
    scrub,
    viewportsPerUnit,
    onActiveChange,
  } = options;

  const total = layers.length;

  // Split each word into characters for the assemble-from-center polish.
  const splits: SplitResult[] = words.map((w) =>
    splitText(w, { mode: "chars" })
  );

  // Focal origins are recomputed on every refresh (resize / font load) so the
  // fly-into-letter stays accurate without re-running the whole setup.
  const applyFocalOrigins = () => {
    layers.forEach((layer, i) => {
      gsap.set(layer, { transformOrigin: focalOrigin(layer, splits[i].chars) });
    });
  };

  // Initial state: every layer tiny + hidden in the depth, except the first,
  // which opens settled and crisp.
  gsap.set(layers, {
    opacity: 0,
    scale: 0.16,
    force3D: true,
    transformOrigin: "38% 48%",
  });
  gsap.set(layers[0], { opacity: 1, scale: 1 });
  splits.forEach((s, i) => {
    gsap.set(s.chars, {
      color: i === 0 ? PRIMARY : ACCENT,
      opacity: i === 0 ? 1 : 0,
      yPercent: i === 0 ? 0 : 40,
      force3D: true,
    });
  });

  // Build the choreography as a paused timeline first; ScrollTrigger is
  // attached afterwards so the scroll distance can be derived from the
  // timeline's actual duration.
  const tl = gsap.timeline({ defaults: { ease: "none" }, paused: true });

  // Author with 1 time-unit per capability so positions read cleanly.
  layers.forEach((layer, i) => {
    const chars = splits[i].chars;
    const isLast = i === total - 1;

    // ENTER — emerge from depth + assemble. The first word skips this (already
    // settled in the initial state above).
    if (i > 0) {
      const enterAt = i - 0.42;
      tl.fromTo(
        layer,
        { opacity: 0, scale: 0.16 },
        { opacity: 1, scale: 1, ease: "power2.out", duration: 0.42 },
        enterAt
      );
      // Letters assemble from the center and resolve accent → primary as the
      // word settles. Cheap: transform + opacity + color only.
      tl.fromTo(
        chars,
        { opacity: 0, yPercent: 40, color: ACCENT },
        {
          opacity: 1,
          yPercent: 0,
          color: PRIMARY,
          ease: "power3.out",
          duration: 0.34,
          stagger: { each: 0.012, from: "center" },
        },
        enterAt + 0.16
      );
    }

    // EXIT — fly into the focal letter and fade. The last word never exits;
    // it gets a short settled hold so the pin releases on a readable frame.
    if (!isLast) {
      const exitAt = i + 0.56;
      tl.to(
        layer,
        {
          scale: scaleCeiling,
          opacity: 0,
          ease: "power2.in",
          duration: 0.44,
        },
        exitAt
      );
    } else {
      tl.to({}, { duration: 0.4 }, ">");
    }
  });

  const duration = tl.duration();

  const st = ScrollTrigger.create({
    animation: tl,
    trigger: pinTarget,
    start: "top top",
    end: () => `+=${window.innerHeight * duration * viewportsPerUnit}`,
    scrub,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: applyFocalOrigins,
    onUpdate: (self) => {
      // Map scroll progress to the timeline's real time, then bias slightly so
      // the caption commits to the emerging word mid-transition.
      const t = self.progress * duration;
      const idx = Math.min(total - 1, Math.max(0, Math.floor(t + 0.3)));
      onActiveChange(idx);
    },
  });

  // Run focal-origin measurement once on build (refresh also re-runs it).
  applyFocalOrigins();

  return {
    destroy: () => {
      st.kill();
      tl.kill();
      splits.forEach((s) => s.revert());
    },
    scrollTrigger: st,
  };
}

export interface VelocitySmearOptions {
  /** The `.cap-warp` element inside each layer. */
  warps: HTMLElement[];
  /** The chromatic-split ghost pair inside each warp ([shiftPos, shiftNeg]). */
  ghosts: Array<[HTMLElement, HTMLElement]>;
  /** Returns the currently active capability index. */
  getActive: () => number;
  /** Tuning ceilings — smaller on mobile. */
  maxStretch?: number; // extra scaleY at full speed
  maxSkew?: number; // degrees of skewX at full speed
  maxSplit?: number; // px of chromatic offset at full speed
  /** The active ScrollTrigger instance to query velocity from. */
  scrollTrigger?: ScrollTrigger;
}

export interface VelocitySmearHandle {
  destroy: () => void;
}

/**
 * Velocity-reactive "molten" smear. Reads smoothed scroll velocity and applies
 * a transform-only stretch + skew to the active word, plus a cyan chromatic
 * split via two pre-rendered ghost copies. The value is lerp-smoothed so it
 * eases in and out, clamped to a ceiling, and settles to a fully crisp 0 at
 * rest for readability. Driven from GSAP's ticker so it shares the existing
 * Lenis rAF loop — no extra requestAnimationFrame.
 */
export function createVelocitySmear(
  options: VelocitySmearOptions
): VelocitySmearHandle {
  const {
    warps,
    ghosts,
    getActive,
    maxStretch = 0.32,
    maxSkew = 5,
    maxSplit = 7,
  } = options;

  // quickSetters write straight to the rendered transform — the cheapest way
  // to push a value every frame.
  const setScaleY = warps.map((w) => gsap.quickSetter(w, "scaleY"));
  const setSkew = warps.map((w) => gsap.quickSetter(w, "skewX", "deg"));
  const setGhostPos = ghosts.map(([p]) => gsap.quickSetter(p, "x", "px"));
  const setGhostNeg = ghosts.map(([, n]) => gsap.quickSetter(n, "x", "px"));
  const setGhostPosO = ghosts.map(([p]) => gsap.quickSetter(p, "opacity"));
  const setGhostNegO = ghosts.map(([, n]) => gsap.quickSetter(n, "opacity"));

  let smooth = 0;
  let lastActive = -1;

  const reset = (i: number) => {
    setScaleY[i](1);
    setSkew[i](0);
    setGhostPos[i](0);
    setGhostNeg[i](0);
    setGhostPosO[i](0);
    setGhostNegO[i](0);
  };

  const tick = () => {
    const trigger = options.scrollTrigger;
    const velocity = trigger ? trigger.getVelocity() : 0;
    // Normalize: ~2600 px/s of scroll velocity ≈ full smear, then clamp.
    const raw = Math.min(1, Math.abs(velocity) / 2600);
    const dir = Math.sign(velocity) || 1;
    // Lerp toward target so distortion eases in/out instead of snapping.
    smooth += (raw - smooth) * 0.12;
    if (smooth < 0.0008) smooth = 0;

    const active = getActive();

    // When the active word changes, snap the previous one fully crisp.
    if (active !== lastActive && lastActive >= 0 && warps[lastActive]) {
      reset(lastActive);
    }
    lastActive = active;

    const w = warps[active];
    if (!w) return;

    setScaleY[active](1 + smooth * maxStretch);
    setSkew[active](smooth * dir * maxSkew);

    const split = smooth * maxSplit;
    const ghostOpacity = smooth * 0.7;
    setGhostPos[active](split);
    setGhostNeg[active](-split);
    setGhostPosO[active](ghostOpacity);
    setGhostNegO[active](ghostOpacity);
  };

  gsap.ticker.add(tick);

  return {
    destroy: () => {
      gsap.ticker.remove(tick);
      warps.forEach((_, i) => reset(i));
    },
  };
}
