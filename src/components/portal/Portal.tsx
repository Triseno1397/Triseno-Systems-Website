"use client";

/**
 * Triseno Systems — Split Portal Homepage
 * Full-viewport two-division portal ported from "Triseno Split Homepage.html".
 * Left panel → Triseno Studio (/studio), right panel → Web Design Division
 * (/web-design-division). GSAP drives the intro curtain, hero reveal, ambient
 * loops, mouse parallax, custom cursor, and magnetic enter buttons.
 *
 * All visual styling lives in globals.css under `.portal-page`.
 */

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Portal() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      const q = <T extends Element = Element>(sel: string) =>
        Array.from(root.querySelectorAll<T>(sel));

      // ── split titles into chars wrapped in lines ──
      root.querySelectorAll<HTMLElement>("[data-split] .line").forEach((line) => {
        const target = line.querySelector<HTMLElement>(".grad") || line;
        if (target.querySelector(".char")) return; // guard against re-split (StrictMode)
        const text = target.textContent ?? "";
        target.textContent = "";
        [...text].forEach((ch) => {
          const s = document.createElement("span");
          s.className = "char";
          s.textContent = ch === " " ? " " : ch;
          target.appendChild(s);
        });
      });

      // ── build floating particles ──
      function buildParticles(host: HTMLElement, count: number) {
        host.replaceChildren();
        const frag = document.createDocumentFragment();
        const nodes: HTMLSpanElement[] = [];
        for (let i = 0; i < count; i++) {
          const s = document.createElement("span");
          const size = 1 + Math.random() * 2.5;
          s.style.width = size + "px";
          s.style.height = size + "px";
          s.style.left = Math.random() * 100 + "%";
          s.style.top = Math.random() * 100 + "%";
          s.style.opacity = (0.15 + Math.random() * 0.5).toFixed(2);
          frag.appendChild(s);
          nodes.push(s);
        }
        host.appendChild(frag);
        return nodes;
      }

      const curtain = root.querySelector<HTMLElement>("#curtain");
      const cBloom = root.querySelector<HTMLElement>("#cBloom");
      const cLogo = root.querySelector<HTMLElement>("#cLogo");
      const cSheen = root.querySelector<HTMLElement>("#cSheen");
      const cDust = root.querySelector<HTMLElement>("#cDust");
      const cUnderline = root.querySelector<HTMLElement>("#cUnderline");
      const cDescriptor = root.querySelector<HTMLElement>("#cDescriptor");

      // build drifting dust particles for the Forge reveal
      const cDustNodes: HTMLSpanElement[] = [];
      if (cDust) {
        cDust.replaceChildren();
        for (let i = 0; i < 26; i++) {
          const s = document.createElement("span");
          const size = 1 + Math.random() * 3;
          s.style.width = size + "px";
          s.style.height = size + "px";
          s.style.left = Math.random() * 100 + "%";
          s.style.top = Math.random() * 100 + "%";
          cDust.appendChild(s);
          cDustNodes.push(s);
        }
      }

      // initial states for hero content
      gsap.set(".panel-eyebrow", { opacity: 0, y: 14 });
      gsap.set(".panel-title .char", { yPercent: 115 });
      gsap.set(".panel-sub", { opacity: 0, y: 16 });
      gsap.set(".panel-enter", { opacity: 0, y: 16 });

      // ── ambient loops ──
      function startAmbient() {
        if (reduce) return;
        // film bars scanning
        gsap.utils.toArray<HTMLElement>(".film-frames .bar").forEach((bar, i) => {
          gsap.fromTo(
            bar,
            { yPercent: 60 },
            { yPercent: -260, duration: 7 + i * 1.5, ease: "none", repeat: -1, delay: i * 2 }
          );
        });
        // web grid slow pan
        gsap.to(".web-grid", { backgroundPosition: "46px 46px", duration: 16, ease: "none", repeat: -1 });

        // particles
        q<HTMLElement>("[data-particles]").forEach((host) => {
          const nodes = buildParticles(host, 26);
          nodes.forEach((n) => {
            const drift = () => {
              gsap.to(n, {
                x: (Math.random() - 0.5) * 80,
                y: -40 - Math.random() * 120,
                opacity: 0,
                duration: 6 + Math.random() * 8,
                ease: "none",
                onComplete: () => {
                  gsap.set(n, { x: 0, y: 0, opacity: (0.15 + Math.random() * 0.5).toFixed(2) });
                  n.style.left = Math.random() * 100 + "%";
                  n.style.top = 60 + Math.random() * 50 + "%";
                  drift();
                },
              });
            };
            gsap.delayedCall(Math.random() * 6, drift);
          });
        });
      }

      const portalEl = root.querySelector<HTMLElement>("#portal");

      // ── INTRO timeline — the "Forge" reveal ──
      const tl = gsap.timeline();
      if (!reduce) {
        gsap.set(cBloom, { opacity: 0, scale: 0.6 });
        gsap.set(cSheen, { opacity: 0, backgroundPosition: "210% 0" });
        gsap.set(cUnderline, { width: 0 });
        gsap.set(cDescriptor, { opacity: 0, y: 8 });
        if (cDustNodes.length) gsap.set(cDustNodes, { opacity: 0, x: 0, y: 0 });
        gsap.set(cLogo, { opacity: 0, scale: 1.08, filter: "drop-shadow(0 0 0px rgba(120,170,220,0)) blur(14px)" });

        tl.to(cBloom, { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" }, 0)
          .to(cLogo, { opacity: 1, scale: 1, filter: "drop-shadow(0 0 26px rgba(120,170,220,0.22)) blur(0px)", duration: 1.0, ease: "power3.out" }, 0.15)
          .to(cSheen, { opacity: 1, duration: 0.1 }, 0.75)
          .to(cSheen, { backgroundPosition: "-60% 0", duration: 1.7, ease: "power2.inOut" }, 0.75)
          .to(cSheen, { opacity: 0, duration: 0.35 }, 2.3);
        if (cDustNodes.length) {
          tl.to(cDustNodes, { opacity: 0.9, duration: 0.2, stagger: 0.01 }, 0.7)
            .to(cDustNodes, { x: () => -60 - Math.random() * 120, y: () => -20 + Math.random() * -60, opacity: 0, duration: 1.3, stagger: 0.015, ease: "power2.out" }, 0.75);
        }
        tl.to(cUnderline, { width: 220, duration: 0.7, ease: "power2.inOut" }, 1.1)
          .to(cDescriptor, { opacity: 1, y: 0, duration: 0.6 }, 1.35)
          .to({}, { duration: 1.1 })
          .to([cUnderline, cDescriptor], { opacity: 0, duration: 0.4 }, ">-0.1")
          .to(curtain, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, ">-0.1")
          .set(curtain, { display: "none" });
      } else {
        gsap.set([cBloom, cLogo, cUnderline, cDescriptor], { opacity: 1 });
        tl.set(curtain, { display: "none" });
      }

      // hero reveal
      tl.to(".seam", { scaleY: 1, duration: 0.9, ease: "power3.inOut" }, reduce ? 0 : "-=0.5")
        .to(".panel-eyebrow", { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }, "-=0.5")
        .to(".panel-title .char", { yPercent: 0, duration: 0.85, stagger: 0.025, ease: "power4.out" }, "-=0.45")
        .to(".panel-sub", { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }, "-=0.5")
        .to(".panel-enter", { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }, "-=0.45")
        .add(() => portalEl?.classList.add("ready"));

      // ambient after intro
      tl.add(startAmbient, "-=0.6");

      // ── manual listeners (tracked for cleanup) ──
      const cleanups: Array<() => void> = [];

      // mouse parallax on bg layers
      if (fine && !reduce) {
        const layers = gsap.utils.toArray<HTMLElement>("[data-parallax]");
        const qx = layers.map((l) => gsap.quickTo(l, "xPercent", { duration: 0.8, ease: "power3" }));
        const qy = layers.map((l) => gsap.quickTo(l, "yPercent", { duration: 0.8, ease: "power3" }));
        const onMove = (e: MouseEvent) => {
          const nx = (e.clientX / window.innerWidth - 0.5) * 2;
          const ny = (e.clientY / window.innerHeight - 0.5) * 2;
          layers.forEach((l, i) => {
            const depth = parseFloat(l.dataset.parallax || "0");
            qx[i](-nx * depth * 3);
            qy[i](-ny * depth * 3);
          });
        };
        window.addEventListener("mousemove", onMove);
        cleanups.push(() => window.removeEventListener("mousemove", onMove));
      }

      // custom cursor + magnetic buttons + division tint
      if (fine) {
        const cursor = root.querySelector<HTMLElement>(".cursor");
        if (cursor) {
          const cx = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
          const cy = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });
          const onCursor = (e: MouseEvent) => { cx(e.clientX); cy(e.clientY); };
          window.addEventListener("mousemove", onCursor);
          cleanups.push(() => window.removeEventListener("mousemove", onCursor));
        }

        q<HTMLElement>("[data-cursor]").forEach((panel) => {
          const enter = () => {
            root.classList.remove("cursor-studio", "cursor-web");
            root.classList.add("cursor-" + panel.dataset.cursor);
          };
          const leave = () => root.classList.remove("cursor-studio", "cursor-web");
          panel.addEventListener("mouseenter", enter);
          panel.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            panel.removeEventListener("mouseenter", enter);
            panel.removeEventListener("mouseleave", leave);
          });
        });

        // magnetic enter buttons
        if (!reduce) {
          q<HTMLElement>(".panel-enter").forEach((btn) => {
            const label = btn.querySelector<HTMLElement>(".label");
            const mx = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
            const my = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
            const parent = btn.closest<HTMLElement>(".panel");
            if (!parent) return;
            const onMove = (e: MouseEvent) => {
              const r = btn.getBoundingClientRect();
              const dx = e.clientX - (r.left + r.width / 2);
              const dy = e.clientY - (r.top + r.height / 2);
              const dist = Math.hypot(dx, dy);
              if (dist < 220) {
                mx(dx * 0.25); my(dy * 0.25);
                if (label) gsap.to(label, { x: dx * 0.06, duration: 0.4 });
              } else {
                mx(0); my(0);
                if (label) gsap.to(label, { x: 0, duration: 0.4 });
              }
            };
            const onLeave = () => { mx(0); my(0); if (label) gsap.to(label, { x: 0, duration: 0.4 }); };
            parent.addEventListener("mousemove", onMove);
            parent.addEventListener("mouseleave", onLeave);
            cleanups.push(() => {
              parent.removeEventListener("mousemove", onMove);
              parent.removeEventListener("mouseleave", onLeave);
            });
          });
        }
      }

      // panel hover: nudge title chars
      if (fine && !reduce) {
        q<HTMLElement>(".panel").forEach((panel) => {
          const chars = panel.querySelectorAll(".panel-title .char");
          const enter = () => {
            gsap.to(chars, { yPercent: -6, stagger: { each: 0.012, from: "start" }, duration: 0.5, ease: "power2.out" });
            gsap.to(chars, { yPercent: 0, stagger: { each: 0.012, from: "start" }, duration: 0.6, ease: "elastic.out(1,0.6)", delay: 0.18 });
          };
          panel.addEventListener("mouseenter", enter);
          cleanups.push(() => panel.removeEventListener("mouseenter", enter));
        });
      }

      return () => {
        cleanups.forEach((fn) => fn());
      };
    },
    { scope: rootRef }
  );

  return (
    <div className="portal-page" ref={rootRef}>
      {/* custom cursor */}
      <div className="cursor" aria-hidden="true">
        <div className="ring" />
        <div className="dot" />
      </div>

      {/* intro curtain — the "Forge" reveal. Uses the existing silver Triseno
          mark (assets/triseno-mark.png was not shipped; swap the src + the two
          mask-image refs in globals.css to use a tighter-trimmed emblem). */}
      <div className="curtain" id="curtain" aria-hidden="true">
        <div className="stage">
          <div className="mark-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="c-logo" id="cLogo" src="/images/triseno-logo-v2.png" alt="Triseno" />
            <div className="sheen" id="cSheen" />
            <div className="dust" id="cDust" aria-hidden="true" />
          </div>
          <div className="c-underline" id="cUnderline" />
          <div className="c-descriptor" id="cDescriptor">Triseno&nbsp;Systems</div>
        </div>
        <div className="bloom" id="cBloom" />
      </div>

      <nav className="nav">
        <a className="nav-mark" href="/">
          <span className="dot" />
          Triseno&nbsp;Systems
        </a>
        {/* TODO: booking URL — point at /contact until a Calendly/booking link exists. */}
        <a className="nav-book" href="/contact">
          Book a call
        </a>
      </nav>

      <main className="portal" id="portal" data-screen-label="Portal Home">
        {/* STUDIO */}
        <a
          className="panel panel-studio"
          data-cursor="studio"
          href="/studio"
          aria-label="Enter Triseno Studio — content & video ads"
        >
          <div className="panel-bg" data-parallax="0.4" />
          <div className="film-frames" data-parallax="0.9" aria-hidden="true">
            <span className="bar" style={{ top: "22%" }} />
            <span className="bar" style={{ top: "50%" }} />
            <span className="bar" style={{ top: "78%" }} />
          </div>
          <div className="particles" data-particles="studio" aria-hidden="true" />
          <div className="panel-inner">
            <div className="panel-eyebrow">
              <span className="pip" />
              Triseno Studio
            </div>
            <h1 className="panel-title" data-split>
              <span className="line">Video that</span>
              <span className="line">
                <span className="grad">sells.</span>
              </span>
            </h1>
            <p className="panel-sub">
              Performance creative for paid social — Meta, TikTok, and YouTube.
            </p>
            <span className="panel-enter">
              <span className="label">Enter the Studio</span> <span className="arr" />
            </span>
          </div>
        </a>

        {/* WEB DESIGN */}
        <a
          className="panel panel-web"
          data-cursor="web"
          href="/web-design-division"
          aria-label="Enter Web Design Division"
        >
          <div className="panel-bg" data-parallax="0.4" />
          <div className="web-grid" data-parallax="0.9" aria-hidden="true" />
          <div className="particles" data-particles="web" aria-hidden="true" />
          <div className="panel-inner">
            <div className="panel-eyebrow">
              <span className="pip" />
              Web Design Division
            </div>
            <h1 className="panel-title" data-split>
              <span className="line">Websites that</span>
              <span className="line">
                <span className="grad">convert.</span>
              </span>
            </h1>
            <p className="panel-sub">Cinematic, conversion-built sites and web experiences.</p>
            <span className="panel-enter">
              <span className="label">Enter the Division</span> <span className="arr" />
            </span>
          </div>
        </a>

        <div className="seam" id="seam" aria-hidden="true" />
        <div className="seam-badge" id="seamBadge" aria-hidden="true">
          <span className="mark">
            <span className="dot" />
            TRISENO
          </span>
          <span className="tag">One studio · Two divisions</span>
        </div>
      </main>

      <div className="corner left" aria-hidden="true">
        Content · Video · Paid Social
      </div>
      <div className="corner right" aria-hidden="true">
        Design · Development · Motion
      </div>
    </div>
  );
}
