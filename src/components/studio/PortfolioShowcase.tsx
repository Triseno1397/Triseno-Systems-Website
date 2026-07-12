"use client";

/**
 * Triseno Studio — Work / showcase page.
 * A reel gallery of real, shipped creative (every clip is our own footage — no
 * stock, no fabricated client logos). Studio-styled chrome (.studio-page) so it
 * reads as one wing of the Studio, and closes on the shared rotating marquee.
 * Gallery styling lives in globals.css under the "SELECTED WORK" block.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpeakerSimpleHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import MarqueeFooter from "@/components/studio/MarqueeFooter";

type Reel = {
  title: string;
  sm: string; // one-line caption
  ratio: string; // "9:16" | "16:9" — drives the tile aspect
  video: string;
  audio?: boolean; // clip carries sound → show the unmute toggle
};

// Every entry maps to a real file in /public/videos. Order interleaves tall and
// wide clips so the masonry reads as a varied gallery, not a uniform grid.
const REELS: Reel[] = [
  { title: "HyperMotion Ads", sm: "Kinetic, footage-free, cut to the beat.", ratio: "9:16", video: "/videos/pickleball-hypermotion.mp4" },
  { title: "Product Hero", sm: "The cinematic beauty shot.", ratio: "16:9", video: "/videos/product-hero.mp4", audio: true },
  { title: "Direct Response", sm: "Built to sell, not to admire.", ratio: "9:16", video: "/videos/direct-response.mp4", audio: true },
  { title: "UGC Ads", sm: "Converts like a recommendation.", ratio: "9:16", video: "/videos/ugc-watch-unbox.mp4", audio: true },
  { title: "ASMR Ads", sm: "Sound you can feel.", ratio: "16:9", video: "/videos/asmr-unbox.mp4", audio: true },
  { title: "Apparel Try-On", sm: "See it worn before they buy.", ratio: "9:16", video: "/videos/apparel-tryon.mp4", audio: true },
  { title: "Product Demo", sm: "Sneaker cleaner — obvious in 30s.", ratio: "9:16", video: "/videos/demo-sneaker-cleaner.mp4" },
  { title: "Visual Appeal", sm: "Satisfying enough to stop the scroll.", ratio: "9:16", video: "/videos/visual-appeal.mp4", audio: true },
  { title: "Product Demo", sm: "Glass cleaner — the value made plain.", ratio: "9:16", video: "/videos/demo-glass-cleaner.mp4" },
];

const STUDIO_EMAIL = "tristen@trisenosystems.com";

// Where the Work page's marquee "Explore" column points (no in-page anchors here).
const WORK_QUICK_LINKS = [
  { label: "What we make", href: "/studio#make" },
  { label: "Start a project", href: "/contact" },
];

export default function PortfolioShowcase() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [scrolled, setScrolled] = useState(false);
  const [soundIndex, setSoundIndex] = useState<number | null>(null); // one clip unmuted at a time

  // Nav — condense on scroll (matches the Studio page).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveals for headlines / eyebrows.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    root.querySelectorAll<HTMLElement>(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Play only the reels in view; pause the rest. Keeps nine clips affordable and
  // sidesteps browser autoplay throttling. Reduced-motion users get still frames.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      videoRefs.current.forEach((v) => {
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    videoRefs.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, []);

  // Drive mute imperatively — React's `muted` prop doesn't reliably reflect to
  // the DOM. Only the selected clip carries audio; every other stays silent.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (v) v.muted = soundIndex !== i;
    });
  }, [soundIndex]);

  const toggleSound = (i: number) => setSoundIndex((s) => (s === i ? null : i));

  return (
    <div className="studio-page" ref={rootRef}>
      <nav className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
        <div className="wrap">
          <Link className="back" href="/">
            <span className="ar" />
            Triseno
          </Link>
          <span className="nav-label">
            <span className="pip" />
            Studio — Selected Work
          </span>
          <Link className="nav-cta" href="/contact">
            Start a project
          </Link>
        </div>
      </nav>

      {/* HEAD */}
      <section className="work-head" data-screen-label="Work Head">
        <div className="wrap">
          <div className="kicker reveal">Selected work</div>
          <h1 className="work-title reveal">
            Proof in the <span className="grad">play button.</span>
          </h1>
          <p className="sec-lead reveal">
            A cross-section of what we ship — hooks, hero shots, demos, and cutdowns across
            every format the feed demands. Real reels, built to perform on the platform they
            run on, not just to look good in a case study.
          </p>
        </div>
      </section>

      {/* GALLERY */}
      <section className="work-section">
        <div className="wrap">
          <div className="work-grid reveal">
            {REELS.map((reel, i) => {
              const [w, h] = reel.ratio.split(":");
              return (
                <div className="work-tile" key={`${reel.title}-${reel.video}`}>
                  <div className="work-media" style={{ aspectRatio: `${w} / ${h}` }}>
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      src={reel.video}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                    />
                    <div className="work-scrim" aria-hidden="true" />
                    <span className="work-badge">{reel.ratio}</span>
                    {reel.audio && (
                      <button
                        type="button"
                        className={`work-sound${soundIndex === i ? " on" : ""}`}
                        aria-label={
                          soundIndex === i ? `Mute ${reel.title}` : `Unmute ${reel.title}`
                        }
                        aria-pressed={soundIndex === i}
                        onClick={() => toggleSound(i)}
                      >
                        {soundIndex === i ? (
                          <SpeakerSimpleHigh size={15} weight="fill" />
                        ) : (
                          <SpeakerSimpleSlash size={15} weight="fill" />
                        )}
                      </button>
                    )}
                    <div className="work-cap">
                      <h3>{reel.title}</h3>
                      <p>{reel.sm}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="wrap">
          <h2 className="reveal">
            Want one of these
            <br />
            for <span className="grad">your product?</span>
          </h2>
          <p className="reveal">
            Tell us what you&apos;re selling and where it needs to run. We&apos;ll come back
            with concepts and a quote — no retainer required to start.
          </p>
          <div className="actions reveal">
            <Link className="btn btn-solid" href="/contact">
              Start a project
            </Link>
            <Link className="btn btn-ghost" href="/studio">
              See what we make
            </Link>
          </div>
          <p className="cta-email reveal">
            <span className="cta-email-lead">Prefer to reach us directly?</span>
            <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>
          </p>
        </div>
      </section>

      <MarqueeFooter quickHeading="Explore" quickLinks={WORK_QUICK_LINKS} />
    </div>
  );
}
