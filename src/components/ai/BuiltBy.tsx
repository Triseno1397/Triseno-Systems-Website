"use client";

import { useEffect, useRef } from "react";
import "@/app/ai-builtby.css";
import { BUILT_BY } from "./content";

/**
 * Built by: the owner's live-broadcast engineering background as the trust
 * beat, stated broadly. A tally lamp comes on as the section arrives (the
 * on-air light of a camera), the statement sets, and the names roll up one
 * line at a time in outline, filling solid as each one lands. No logos, no
 * project claims: a few names and "many more".
 */
export default function BuiltBy() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-on", "");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.setAttribute("data-on", "");
        io.disconnect();
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const names = [...BUILT_BY.names, ...BUILT_BY.corporate];

  return (
    <section ref={rootRef} data-rail="Built by" aria-labelledby="ai-built-title" className="ai-section ai-built relative z-10">
      <div className="ai-wrap">
        <p className="ai-label ai-built__label">
          <span aria-hidden="true" className="ai-built__tally" />
          {BUILT_BY.label}
        </p>
        <h2 id="ai-built-title" className="ai-built__title font-display font-bold uppercase">
          {BUILT_BY.title}
        </h2>
        <p className="ai-body ai-built__body">{BUILT_BY.body}</p>

        <ul className="ai-built__names" aria-label="A few of the live shows and companies">
          {names.map((n, i) => (
            <li key={n} className="ai-built__name font-display font-bold uppercase" style={{ ["--i" as string]: i }}>
              <span className="ai-built__clip">
                <span className="ai-built__ink">{n}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="ai-built__foot">
          <p className="ai-built__more font-mono">{BUILT_BY.more}</p>
          <p className="ai-built__close">{BUILT_BY.close}</p>
        </div>
      </div>
    </section>
  );
}
