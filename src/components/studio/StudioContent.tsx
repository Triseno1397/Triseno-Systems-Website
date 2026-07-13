"use client";

/**
 * Triseno Studio — content division page (v2, ported from Triseno Studio.html).
 * Sections: Nav · Hero · What We Make (index drives a sticky crossfade preview) ·
 * The Triseno Edge · CTA · Marquee footer.
 * The old "How it works" stepper and standalone reel are intentionally absent —
 * all video weight lives in What We Make. Styling is in globals.css (.studio-page).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpeakerSimpleHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import MarqueeFooter from "@/components/studio/MarqueeFooter";
import { studioFormats } from "@/content/reels";

type MakeItem = {
  n: string;
  title: string;
  sm: string;
  desc: string;
  ratio: string;
  tags: string[];
  hotspot: string;
  video?: string; // per-format demo reel; falls back to the gradient thumb when absent
  audio?: boolean; // clip carries a soundtrack — surfaces the mute/unmute toggle
  // Two clips shown side by side in one preview (Product Demo showcase). Takes
  // precedence over `video`; each cell has its own caption and independent unmute.
  videos?: { src: string; label: string }[];
};

// Projected from the shared reel library (src/content/reels.json), which the Work
// gallery also renders from. Keeps the shape this component already consumes: a
// single-clip format exposes `video`, a multi-clip one exposes `videos` and takes
// precedence in the preview, and a format with no clip yet (Brand Films) falls back
// to the gradient thumb. The 01..09 numbering is positional, so reordering the
// library renumbers the index for free.
const MAKE: MakeItem[] = studioFormats().map((f, i) => ({
  n: String(i + 1).padStart(2, "0"),
  title: f.title,
  sm: f.tagline,
  desc: f.description,
  ratio: f.ratio,
  tags: f.tags,
  hotspot: f.hotspot,
  ...(f.clips.length > 1
    ? { videos: f.clips.map((c) => ({ src: c.src, label: c.label ?? "" })) }
    : f.clips.length === 1
      ? { video: f.clips[0].src, audio: f.clips[0].audio }
      : {}),
}));

// Thumb hotspot varies a touch per item so the preview feels alive. It now travels
// with the format in reels.json rather than a parallel array indexed by position,
// which used to silently mis-pair every hotspot the moment a reel was reordered.
const thumbBg = (hotspot: string) =>
  `radial-gradient(ellipse at ${hotspot}, rgba(255,138,61,0.20), transparent 60%),` +
  `repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 5px), var(--bg-raised)`;

// Where every Studio CTA routes. Displayed and mailed to the same address.
const STUDIO_EMAIL = "tristen@trisenosystems.com";
// Instagram is tagged alongside the email everywhere it appears on the site.
const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
const INSTAGRAM_HANDLE = "@trisenosystems";

// Inquiries post straight to the studio inbox via Web3Forms — no mail client
// opens, no server needed, works on Vercel. Set the free access key in Vercel as
// NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (or paste it into the fallback below). Get one
// in ~30s at https://web3forms.com by entering tristen@trisenosystems.com.
const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

// The formats a visitor can pick, so the inquiry says what they actually want.
const PROJECT_TYPES = [
  "HyperMotion Ads",
  "Product Hero",
  "Direct Response Ads",
  "Product Demo",
  "Brand Film",
  "UGC Ads",
  "Not sure yet",
];

// How they'd like us to follow up.
const CONTACT_METHODS = ["Email", "Phone", "Text", "Other"];

export default function StudioContent() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const duoVideoRefs = useRef<(HTMLVideoElement | null)[]>([]); // dual-showcase clips

  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(0); // selected tab (drives .on immediately)
  const [shown, setShown] = useState(0); // content currently in the preview
  const [fading, setFading] = useState(false);
  const [sound, setSound] = useState(false); // preview audio on/off (starts muted)
  const [duoSound, setDuoSound] = useState<number | null>(null); // which dual clip is unmuted (one at a time)
  const [sent, setSent] = useState(false); // inquiry delivered to the inbox
  const [sending, setSending] = useState(false); // request in flight
  const [err, setErr] = useState<string | null>(null); // delivery failure message

  // Inquiry form — one avenue for the whole division. Posts the fields straight
  // to the studio inbox via Web3Forms (no mail client, no server, works on
  // Vercel), then confirms in-place.
  const handleInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setErr(null);

    if (!WEB3FORMS_ACCESS_KEY) {
      setErr(`The form isn't connected yet — please email us directly at ${STUDIO_EMAIL}.`);
      return;
    }

    setSending(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: "New project inquiry — Triseno Studio",
      from_name: "Triseno Studio website",
      division: "Content Studio",
      ...Object.fromEntries(fd.entries()),
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setErr(`Something went wrong — please email us directly at ${STUDIO_EMAIL}.`);
      }
    } catch {
      setErr(`Couldn't send right now — please email us directly at ${STUDIO_EMAIL}.`);
    } finally {
      setSending(false);
    }
  };

  // Nav — condense on scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveals (headlines / eyebrows only).
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

  useEffect(() => () => {
    if (swapTimer.current) clearTimeout(swapTimer.current);
  }, []);

  // Honor reduced-motion: the format reel autoplays for everyone else, but users
  // who opt out get a still first frame instead of a looping clip.
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    previewRef.current?.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.currentTime = 0;
    });
  }, [shown]);

  // Drive mute imperatively — React's `muted` prop doesn't reliably reflect to
  // the DOM. Only the foreground clip is unmuted; the blurred fill stays silent.
  useEffect(() => {
    if (mainVideoRef.current) mainVideoRef.current.muted = !sound;
  }, [sound, shown]);

  // Dual showcase: only the selected clip carries audio — the other stays muted,
  // so two soundtracks never overlap.
  useEffect(() => {
    duoVideoRefs.current.forEach((v, i) => {
      if (v) v.muted = duoSound !== i;
    });
  }, [duoSound, shown]);

  // Select a format — tab highlights instantly, preview crossfades after 180ms.
  const select = (i: number) => {
    if (i === active) return;
    setActive(i);
    setFading(true);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setShown(i);
      setFading(false);
      setSound(false); // new format lands muted so switching tabs never blares audio
      setDuoSound(null); // ...and the dual showcase resets to fully muted too
    }, 180);
  };

  const d = MAKE[shown];

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
            Studio — Content Division
          </span>
          <a className="nav-cta" href="#contact">
            Start a project
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" data-screen-label="Studio Hero">
        <div className="hero-bg" />
        <div className="hero-frames" aria-hidden="true">
          <span className="bar" style={{ top: "18%", animationDelay: "0s" }} />
          <span className="bar" style={{ top: "44%", animationDelay: "3s" }} />
          <span className="bar" style={{ top: "70%", animationDelay: "6s" }} />
        </div>
        <div className="wrap">
          <div className="hero-eyebrow">Triseno Studio</div>
          <h1 className="hero-title">
            Video that sells
            <br />
            <span className="grad">while it scrolls.</span>
          </h1>
          <p className="hero-sub">
            We script, shoot, and edit performance creative for Instagram, TikTok, YouTube,
            and every feed in between — from UGC to cinematic brand films. Built to convert,
            not just to look good.
          </p>
          <div className="hero-actions">
            <a className="btn btn-solid" href="#contact">
              Start a project
            </a>
            <a className="btn btn-ghost" href="#make">
              See what we make
            </a>
          </div>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          ↓ What we make
        </div>
      </header>

      {/* WHAT WE MAKE */}
      <section id="make">
        <div className="wrap">
          <div className="kicker reveal">What we make</div>
          <h2 className="sec-title reveal">One studio. Every format the feed demands.</h2>
          <p className="sec-lead reveal">
            Start where you need volume and climb to where you need polish. Every tier is
            built to perform on the platform it ships to — not just to look good in a
            portfolio.
          </p>

          <div className="make reveal">
            <div className="make-index" role="tablist" aria-label="What we make">
              {MAKE.map((f, i) => {
                const on = active === i;
                return (
                  <button
                    key={f.n}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={`ix${on ? " on" : ""}`}
                    onMouseEnter={() => select(i)}
                    onFocus={() => select(i)}
                    onClick={() => select(i)}
                  >
                    <span className="n">{f.n}</span>
                    <span className="t">
                      {f.title}
                      <span className="sm">{f.sm}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="make-preview" aria-live="polite" ref={previewRef}>
              {d.videos ? (
                <div className={`pv-video-wrap pv-duo${fading ? " pv-fade" : ""}`}>
                  {d.videos.map((clip, i) => (
                    <div className="pv-duo-cell" key={clip.src}>
                      {/* Ambient blurred fill so each clip shows whole — no cropping
                          of the hook or CTA — regardless of its orientation. */}
                      <video
                        className="pv-duo-bg"
                        src={clip.src}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="metadata"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <video
                        ref={(el) => {
                          duoVideoRefs.current[i] = el;
                        }}
                        className="pv-duo-vid"
                        src={clip.src}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="metadata"
                      />
                      <span className="pv-duo-cap">{clip.label}</span>
                      <button
                        type="button"
                        className={`pv-duo-sound${duoSound === i ? " on" : ""}`}
                        aria-label={
                          duoSound === i ? `Mute ${clip.label}` : `Unmute ${clip.label}`
                        }
                        aria-pressed={duoSound === i}
                        onClick={() => setDuoSound((s) => (s === i ? null : i))}
                      >
                        {duoSound === i ? (
                          <SpeakerSimpleHigh size={15} weight="fill" />
                        ) : (
                          <SpeakerSimpleSlash size={15} weight="fill" />
                        )}
                      </button>
                    </div>
                  ))}
                  {/* Bottom scrim keeps the meta legible over both clips. */}
                  <div className="pv-scrim" aria-hidden="true" />
                </div>
              ) : d.video ? (
                <div className={`pv-video-wrap${fading ? " pv-fade" : ""}`}>
                  {/* Blurred fill of the same clip so a 9:16 ad fills the wide
                      frame without cropping the hook or CTA. */}
                  <video
                    className="pv-video-bg"
                    src={d.video}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  {/* The ad itself, shown whole. */}
                  <video
                    ref={mainVideoRef}
                    key={d.video}
                    className="pv-video"
                    src={d.video}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                  {/* Bottom scrim keeps the meta legible over the moving footage. */}
                  <div className="pv-scrim" aria-hidden="true" />
                </div>
              ) : (
                <>
                  <div
                    className={`pv-thumb${fading ? " pv-fade" : ""}`}
                    style={{ background: thumbBg(d.hotspot) }}
                  />
                  <div className="pv-play" aria-hidden="true" />
                </>
              )}
              {d.video && d.audio && (
                <button
                  type="button"
                  className={`pv-sound${sound ? " on" : ""}`}
                  aria-label={sound ? "Mute preview" : "Unmute preview"}
                  aria-pressed={sound}
                  onClick={() => setSound((s) => !s)}
                >
                  {sound ? (
                    <SpeakerSimpleHigh size={17} weight="fill" />
                  ) : (
                    <SpeakerSimpleSlash size={17} weight="fill" />
                  )}
                </button>
              )}
              {/* Single badge would misread with two clips of different ratios —
                  the per-clip captions carry the labels instead. */}
              {!d.videos && <div className="pv-ratio">{d.ratio}</div>}
              <div className={`pv-meta${fading ? " pv-fade" : ""}`}>
                <h3>{d.title}</h3>
                <p>{d.desc}</p>
                <div className="pv-tags">
                  {d.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDGE */}
      <section className="edge">
        <div className="wrap edge-grid">
          <div className="reveal">
            <div className="kicker">The Triseno edge</div>
            <h2>
              Agency-grade work, <span className="grad">without the agency timeline.</span>
            </h2>
          </div>
          <div className="reveal">
            <p>
              Triseno was built on an AI-powered production pipeline, and that engine never left.
              It&apos;s how we generate more concepts, version creative for every placement, and
              turn briefs around in days. You don&apos;t pay for the technology. You pay for the
              speed, the volume, and the edge it buys you.
            </p>
            <div className="pills">
              <span className="pill">AI-accelerated</span>
              <span className="pill">Concepts at volume</span>
              <span className="pill">Multi-placement</span>
              <span className="pill">Founder-led</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="cta">
        <div className="wrap">
          <h2 className="reveal">
            Let&apos;s make the ad
            <br />
            that <span className="grad">pays for itself.</span>
          </h2>
          <p className="reveal">
            Tell us what you&apos;re selling and where it needs to run. We&apos;ll come back with
            concepts and a quote — no retainer required to start.
          </p>

          {sent ? (
            <div className="inquiry-sent">
              <h3>Thanks — your inquiry is in.</h3>
              <p>
                We&apos;ve got it and we&apos;ll get back to you within one business day.
                Prefer to reach us directly?{" "}
                <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form className="inquiry" onSubmit={handleInquiry}>
              {/* Honeypot — bots fill this, humans never see it. */}
              <input
                type="checkbox"
                name="botcheck"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: "none" }}
                aria-hidden="true"
              />

              <div className="row">
                <div className="field">
                  <label htmlFor="iq-name">Name</label>
                  <input id="iq-name" name="name" type="text" required placeholder="Your name" />
                </div>
                <div className="field">
                  <label htmlFor="iq-email">Email</label>
                  <input
                    id="iq-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label htmlFor="iq-phone">Phone (optional)</label>
                  <input id="iq-phone" name="phone" type="tel" placeholder="(555) 000-0000" />
                </div>
                <div className="field">
                  <label htmlFor="iq-contact">Preferred contact</label>
                  <select id="iq-contact" name="preferred_contact" defaultValue="Email">
                    {CONTACT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label htmlFor="iq-type">What do you want made?</label>
                  <select id="iq-type" name="project_type" defaultValue="">
                    <option value="" disabled>
                      Select a format
                    </option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="iq-budget">Budget range (optional)</label>
                  <select id="iq-budget" name="budget" defaultValue="">
                    <option value="">Not sure yet</option>
                    <option>Under $2k</option>
                    <option>$2k–$5k</option>
                    <option>$5k–$10k</option>
                    <option>$10k+</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="iq-project">Tell us what you&apos;re looking for</label>
                <textarea
                  id="iq-project"
                  name="project"
                  required
                  placeholder="What you're selling, who it's for, where it needs to run (Instagram, TikTok, YouTube…), how many videos, and any timeline in mind."
                />
              </div>

              {err && (
                <p
                  className="inquiry-note"
                  role="alert"
                  style={{ color: "#ff8a8a", textAlign: "left" }}
                >
                  {err}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-solid"
                disabled={sending}
                style={sending ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
              >
                {sending ? "Sending…" : "Send inquiry"}
              </button>
              <p className="inquiry-note">
                Goes straight to our inbox — we reply within one business day.
              </p>
            </form>
          )}

          <p className="cta-email reveal">
            <span className="cta-email-lead">Prefer to reach us directly?</span>
            <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>
            <span className="cta-email-sep" aria-hidden="true">·</span>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Instagram {INSTAGRAM_HANDLE}
            </a>
          </p>
        </div>
      </section>

      <MarqueeFooter />
    </div>
  );
}
