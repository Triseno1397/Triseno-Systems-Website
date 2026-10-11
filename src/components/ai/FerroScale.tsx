"use client";

import "@/app/ai-ferro.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFrameScrubber, type FrameFilm } from "@/lib/frameScrub";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fig. 02, Scale: a pool of ferrofluid that the scroll bar raises.
 *
 * Pinned for a few screens. A window on the paper opens to full bleed first
 * (a clip-path, so nothing reflows), with crop marks riding its corners and
 * the headline set twice, ink on the paper and paper on the plate, so each
 * letter changes colour exactly where it crosses the edge. Then the film
 * plays under the scroll: a flat mirror of liquid metal lifts at the centre
 * and climbs into a crown of spikes while the two halves of the headline
 * part to the corners to make room for it. Scroll back and it sinks again.
 *
 * The film is a generated clip cut into frames (public/frames/ferro-*),
 * drawn by lib/frameScrub, fetched only when the section is near.
 * Reduced motion: no pin; the open plate at its final frame, headline parted.
 */

const FILM: FrameFilm = {
  landscape: { dir: "/frames/ferro-d", count: 96, width: 1600, height: 900 },
  portrait: { dir: "/frames/ferro-m", count: 96, width: 720, height: 1280 },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function FerroScale() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const media = mediaRef.current;
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    if (!stage || !media || !paper || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrub = createFrameScrubber(canvas, FILM, () => media.setAttribute("data-ready", ""));

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        scrub.load();
        io.disconnect();
      },
      { rootMargin: "120% 0px 120% 0px" },
    );
    io.observe(stage);
    const ro = new ResizeObserver(() => scrub.resize());
    ro.observe(stage);

    const crops = Array.from(stage.querySelectorAll<HTMLElement>(".ai-fs__crop"));
    const halvesA = Array.from(stage.querySelectorAll<HTMLElement>('.ai-fs__half[data-h="a"]'));
    const halvesB = Array.from(stage.querySelectorAll<HTMLElement>('.ai-fs__half[data-h="b"]'));
    const feet = Array.from(stage.querySelectorAll<HTMLElement>(".ai-fs__foot"));
    const anchorA = stage.querySelector<HTMLElement>('.ai-fs__anchor[data-a="a"]');
    const anchorB = stage.querySelector<HTMLElement>('.ai-fs__anchor[data-a="b"]');

    if (reduce) {
      stage.setAttribute("data-static", "");
      scrub.load();
      scrub.setProgress(1);
      return () => {
        io.disconnect();
        ro.disconnect();
        scrub.dispose();
      };
    }

    const open = gsap.parseEase("power2.inOut");
    const part = gsap.parseEase("power3.inOut");
    let W = 1;
    let H = 1;
    let phone = false;
    let dA = { x: 0, y: 0 };
    let dB = { x: 0, y: 0 };

    const measure = () => {
      const r = stage.getBoundingClientRect();
      W = r.width;
      H = r.height;
      phone = W < 768;
      // where each half of the headline lands: the anchors sit in the lanes
      // half A lands with its top-left on anchor A; half B with its
      // bottom-right on anchor B (so the longer line never leaves the stage)
      const delta = (half: HTMLElement | undefined, anchor: HTMLElement | null, end: boolean) => {
        if (!half || !anchor) return { x: 0, y: 0 };
        const h = half.getBoundingClientRect();
        const a = anchor.getBoundingClientRect();
        return end ? { x: a.right - h.right, y: a.bottom - h.bottom } : { x: a.left - h.left, y: a.top - h.top };
      };
      // measure from the resting (untransformed) position
      [...halvesA, ...halvesB].forEach((el) => (el.style.transform = ""));
      dA = delta(halvesA[0], anchorA, false);
      dB = delta(halvesB[0], anchorB, !phone);
    };

    const apply = (p: number) => {
      const o = open(clamp01(p / 0.3));
      const ix = (1 - o) * (phone ? 0.08 : 0.31) * W;
      const iy = (1 - o) * (phone ? 0.3 : 0.24) * H;
      const clip = `inset(${iy}px ${ix}px ${iy}px ${ix}px)`;
      media.style.clipPath = clip;
      paper.style.clipPath = clip;
      crops.forEach((c) => {
        const sx = c.dataset.c === "tl" || c.dataset.c === "bl" ? ix : -ix;
        const sy = c.dataset.c === "tl" || c.dataset.c === "tr" ? iy : -iy;
        c.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      });

      scrub.setProgress(clamp01((p - 0.22) / 0.73));

      const k = part(clamp01((p - 0.3) / 0.5));
      const ta = `translate3d(${dA.x * k}px, ${dA.y * k}px, 0)`;
      const tb = `translate3d(${dB.x * k}px, ${dB.y * k}px, 0)`;
      halvesA.forEach((el) => (el.style.transform = ta));
      halvesB.forEach((el) => (el.style.transform = tb));

      const f = clamp01((p - 0.6) / 0.2);
      feet.forEach((el) => {
        el.style.opacity = String(f);
        el.style.transform = `translate3d(0, ${(1 - f) * 10}px, 0)`;
      });
    };

    const st = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: "+=280%",
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: (self) => {
        measure();
        apply(self.progress);
      },
      onUpdate: (self) => apply(self.progress),
    });
    measure();
    apply(0);

    return () => {
      st.kill();
      io.disconnect();
      ro.disconnect();
      scrub.dispose();
    };
  }, []);

  return (
    <section data-rail="Scale" data-ch="03" aria-labelledby="ai-fs-title" className="ai-fs relative z-10">
      <div ref={stageRef} className="ai-fs__stage">
        <div
          ref={mediaRef}
          className="ai-fs__media"
          role="img"
          aria-label="A pool of liquid metal on a dark steel plate rising into a crown of mirror-bright spikes"
        >
          <canvas ref={canvasRef} className="ai-fs__canvas" aria-hidden="true" />
        </div>
        <span aria-hidden="true" className="ai-fs__crop" data-c="tl" />
        <span aria-hidden="true" className="ai-fs__crop" data-c="tr" />
        <span aria-hidden="true" className="ai-fs__crop" data-c="bl" />
        <span aria-hidden="true" className="ai-fs__crop" data-c="br" />
        <span aria-hidden="true" className="ai-fs__anchor" data-a="a" />
        <span aria-hidden="true" className="ai-fs__anchor" data-a="b" />

        <div className="ai-fs__layer ai-fs__layer--ink">
          <Overlay copy={false} />
        </div>
        <div ref={paperRef} className="ai-fs__layer ai-fs__layer--paper" aria-hidden="true">
          <Overlay copy />
        </div>
      </div>
    </section>
  );
}

function Overlay({ copy }: { copy: boolean }) {
  const Tag = copy ? "p" : "h2";
  return (
    <>
      <Tag id={copy ? undefined : "ai-fs-title"} className="ai-fs__title font-display">
        <span className="ai-fs__half" data-h="a">
          Designed
        </span>
        <span className="ai-fs__half" data-h="b">
          to scale.
        </span>
      </Tag>
      <p className="ai-fs__foot font-mono">
        <b>Built once</b>
        <span>Ten orders a day or ten thousand. The same tool, the same calm.</span>
      </p>
    </>
  );
}
