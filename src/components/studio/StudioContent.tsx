"use client";

/**
 * Triseno Studio — content division page (v2, ported from Triseno Studio.html).
 * Sections: Nav · Hero · What We Make (index drives a sticky crossfade preview) ·
 * The Triseno Edge · CTA · Marquee footer.
 * The old "How it works" stepper and standalone reel are intentionally absent —
 * all video weight lives in What We Make. Styling is in globals.css (.studio-page).
 */

import { Fragment, useEffect, useRef, useState } from "react";
import { SpeakerSimpleHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";

type MakeItem = {
  n: string;
  title: string;
  sm: string;
  desc: string;
  ratio: string;
  tags: string[];
  video?: string; // per-format demo reel; falls back to the gradient thumb when absent
  audio?: boolean; // clip carries a soundtrack — surfaces the mute/unmute toggle
  // Two clips shown side by side in one preview (UGC showcase). Takes precedence
  // over `video`; each cell has its own caption and independent unmute.
  videos?: { src: string; label: string }[];
};

const MAKE: MakeItem[] = [
  {
    n: "01",
    title: "HyperMotion Ads",
    sm: "Maximum motion. No shoot day.",
    desc: "Our flagship. Kinetic type, product-hero motion, and generative visuals cut hard to the beat — high-velocity, footage-free ads designed frame by frame. The AI engine turns a concept into a scroll-stopper in days, not a production schedule.",
    ratio: "9:16",
    tags: ["9:16 · 1:1 · 16:9", "Footage-free", "AI-accelerated"],
    video: "/videos/pickleball-hypermotion.mp4",
  },
  {
    n: "02",
    title: "Product Hero",
    sm: "The shot that makes it look expensive.",
    desc: "Rim light, a slow push-in, a curl of steam — the cinematic beauty shot that makes the product look worth every penny. Pure Tier-1 craft, and our most reliable, best-looking work.",
    ratio: "16:9",
    tags: ["16:9 · 4:5 · 9:16", "Cinematic", "Tier-1 beauty"],
    video: "/videos/product-hero.mp4",
    audio: true,
  },
  {
    n: "03",
    title: "Direct Response Ads",
    sm: "Built to sell, not to admire.",
    desc: "Fast hook, clear benefit, hard offer, unmissable CTA — structured around the click, not the applause. The workhorse a performance founder is actually shopping for.",
    ratio: "9:16",
    tags: ["9:16 · 1:1 · 4:5", "3–6 variants", "Performance"],
    video: "/videos/direct-response.mp4",
    audio: true,
  },
  {
    n: "04",
    title: "Product Demo",
    sm: "Obvious in 30 seconds.",
    desc: "Shows the thing actually working — crisp, result-focused demos that make the value obvious for landing pages, product detail pages, and mid-funnel retargeting.",
    ratio: "16:9",
    tags: ["16:9 · 1:1 · 9:16", "Master + cutdowns", "Conversion"],
  },
  {
    n: "05",
    title: "Brand Films",
    sm: "The flagship piece.",
    desc: "Longer, moodier, aspirational — cinematic hero pieces for the top of your site and the top of your funnel. Story, craft, and scale in a single film, and the premium upsell to everything above.",
    ratio: "2.39:1",
    tags: ["16:9 · 2.39:1", "Hero film + edits", "Flagship"],
  },
  {
    n: "06",
    title: "UGC Ads",
    sm: "Converts like a recommendation.",
    desc: "Authentic, native-to-the-feed content — sourced, matched, and directed to feel like word of mouth instead of an ad break. From ASMR unboxings to hands-on demos, across every orientation the feed serves.",
    ratio: "9:16",
    tags: ["9:16 · 16:9", "Creator-matched", "Volume"],
    videos: [
      { src: "/videos/ugc-watch-unbox.mp4", label: "Watch unboxing" },
      { src: "/videos/ugc-pixl-unbox.mp4", label: "ASMR unboxing" },
    ],
  },
  {
    n: "07",
    title: "Apparel Try-On",
    sm: "See it worn before they buy.",
    desc: "The product on a real body — fit, drape, and movement in motion — so shoppers can picture themselves in it before checkout. The confidence-builder that closes the sale for fashion and apparel brands.",
    ratio: "9:16",
    tags: ["9:16 · 4:5", "On-model", "Fashion & apparel"],
    video: "/videos/apparel-tryon.mp4",
    audio: true,
  },
];

// Thumb hotspot varies a touch per item so the preview feels alive.
const HOTSPOTS = ["55% 32%", "40% 40%", "65% 30%", "50% 45%", "48% 38%", "58% 35%", "45% 33%"];
const thumbBg = (i: number) =>
  `radial-gradient(ellipse at ${HOTSPOTS[i]}, rgba(255,138,61,0.20), transparent 60%),` +
  `repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 5px), var(--bg-raised)`;

// Where every Studio CTA routes. Displayed and mailed to the same address.
const STUDIO_EMAIL = "tristen@trisenosystems.com";
// Instagram is tagged alongside the email everywhere it appears on the site.
const INSTAGRAM_URL = "https://instagram.com/trisenosystems";
const INSTAGRAM_HANDLE = "@trisenosystems";

// Build a mailto: with an encoded subject + body — opens the visitor's mail
// client pre-addressed to the studio inbox. No backend required, works on Vercel.
const mailto = (subject: string, bodyLines: string[]) =>
  `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}` +
  `&body=${encodeURIComponent(bodyLines.join("\r\n"))}`;

// One copy of the footer marquee sequence; rendered twice for a seamless wrap.
const FOOT_WORDS = [
  { text: "Triseno", cls: "fill" },
  { text: "Studio", cls: "" },
  { text: "Triseno", cls: "g" },
  { text: "Studio", cls: "" },
];

function MarqueeFooter() {
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
            <h4>Studio</h4>
            <a href="#make">What we make</a>
            <a href="#contact">Start a project</a>
          </div>
          <div className="foot-col">
            <h4>Triseno</h4>
            <a href="/">Home</a>
            {/* Static division page in /public — plain anchor. */}
            <a href="/web-design-division">Web Design Division</a>
            <a href="/contact">Contact</a>
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
  const [sent, setSent] = useState(false); // inquiry form → email handed off

  // Inquiry form — one avenue for the whole division. Composes a pre-addressed
  // email from the fields and hands it to the visitor's mail client (no backend,
  // works on Vercel), then confirms in-place.
  const handleInquiry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const budget = String(fd.get("budget") || "").trim();
    const project = String(fd.get("project") || "").trim();

    const lines = [`Name: ${name}`, `Email: ${email}`];
    if (budget) lines.push(`Budget: ${budget}`);
    lines.push("", "Project:", project);

    window.location.href = mailto("New project inquiry — Triseno Studio", lines);
    setSent(true);
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
          <a className="back" href="/">
            <span className="ar" />
            Triseno
          </a>
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
                    style={{ background: thumbBg(shown) }}
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
              <h3>Thanks — your email is ready to send.</h3>
              <p>
                We just opened a pre-filled message in your mail app. Hit send and we&apos;ll
                get back to you within one business day. If nothing opened, reach us at{" "}
                <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form className="inquiry" onSubmit={handleInquiry}>
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
              <div className="field">
                <label htmlFor="iq-project">What are you looking to make?</label>
                <textarea
                  id="iq-project"
                  name="project"
                  required
                  placeholder="What you're selling, where it needs to run, and any timeline in mind..."
                />
              </div>
              <button type="submit" className="btn btn-solid">
                Send inquiry
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
