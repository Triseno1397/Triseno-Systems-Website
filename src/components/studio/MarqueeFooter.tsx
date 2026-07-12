"use client";

/**
 * Studio-division marquee footer — the slow, scroll-reactive "Triseno · Studio"
 * band with a contact row beneath it. Shared by the Studio page and the Work
 * (portfolio) showcase so both divisions close on the same signature footer.
 * All styling lives in globals.css under `.studio-page footer`.
 */

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";

// Contact identity — matches the rest of the Studio chrome.
const STUDIO_EMAIL = "tristen@trisenosystems.com";
const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
const INSTAGRAM_HANDLE = "@trisenosystems";

// One copy of the marquee sequence; rendered twice for a seamless wrap.
const FOOT_WORDS = [
  { text: "Triseno", cls: "fill" },
  { text: "Studio", cls: "" },
  { text: "Triseno", cls: "g" },
  { text: "Studio", cls: "" },
];

type QuickLink = { label: string; href: string };

// Defaults suit the Studio page (in-page anchors); the Work page passes its own.
const DEFAULT_QUICK_HEADING = "Studio";
const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { label: "What we make", href: "#make" },
  { label: "Start a project", href: "#contact" },
];

export default function MarqueeFooter({
  quickHeading = DEFAULT_QUICK_HEADING,
  quickLinks = DEFAULT_QUICK_LINKS,
}: {
  quickHeading?: string;
  quickLinks?: QuickLink[];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = 0;
    const base = 0.6;
    let vel = 0;
    let half = track.scrollWidth / 2;
    let last = 0;
    let raf = 0;

    const measure = () => {
      half = track.scrollWidth / 2;
    };
    const onScroll = () => {
      vel = Math.min(6, vel + 1.2);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(40, now - last) : 16;
      last = now;
      x -= ((base + vel) * dt) / 16;
      if (half && -x >= half) x += half;
      track.style.transform = `translateX(${x}px)`;
      vel *= 0.9;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <footer>
      <div className="foot-marq" aria-hidden="true">
        <div className="foot-track" ref={trackRef}>
          {[0, 1].map((copy) =>
            FOOT_WORDS.map((w, i) => (
              <Fragment key={`${copy}-${i}`}>
                <span className={`word ${w.cls}`}>{w.text}</span>
                <span className="star">⋯</span>
              </Fragment>
            ))
          )}
        </div>
      </div>

      <div className="wrap">
        <div className="foot-body">
          <div className="foot-say">
            <span className="line">
              Let&apos;s make something <span className="grad">worth watching.</span>
            </span>
            <div className="contacts">
              <a className="em" href={`mailto:${STUDIO_EMAIL}`}>
                {STUDIO_EMAIL}
              </a>
              <a
                className="em"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="em-label">Instagram</span>
                <span className="em-handle">{INSTAGRAM_HANDLE}</span>
              </a>
            </div>
          </div>
          <div className="foot-col">
            <h4>{quickHeading}</h4>
            {quickLinks.map((link) => (
              <a key={`${link.label}-${link.href}`} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="foot-col">
            <h4>Triseno</h4>
            <Link href="/">Home</Link>
            {/* Static division page in /public — plain anchor. */}
            <a href="/web-design-division">Web Design Division</a>
            <Link href="/contact">Contact</Link>
          </div>
        </div>

        <div className="foot-bottom">
          <span className="fmeta">© 2026 Triseno Systems</span>
          {/* Instagram is live; TODO: wire TikTok / YouTube / LinkedIn when handles exist. */}
          <span className="fmeta">
            <a
              href="https://instagram.com/trisenosystems"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            &nbsp;·&nbsp; TikTok &nbsp;·&nbsp; YouTube &nbsp;·&nbsp; LinkedIn
          </span>
        </div>
      </div>
    </footer>
  );
}
