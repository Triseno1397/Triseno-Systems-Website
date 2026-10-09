"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cleanDark } from "./cleanDark";

gsap.registerPlugin(ScrollTrigger);

/**
 * The way out of the clean room: the page's last sheet is torn open by an
 * iris. As it rises into view a circle of the dark world (the radiant core at
 * the end of the nave, in full colour) opens from a pinhole in the paper and
 * swallows the frame, so the gate and the sign-off stand in the same dark the
 * rest of the site lives in. The one other scrubbed moment on the page, and
 * only a clip-path moves. Reduced motion: it is simply open.
 */
export default function Descent({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const irisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const iris = irisRef.current;
    if (!root || !iris) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      iris.style.clipPath = "none";
      root.setAttribute("data-open", "");
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top 12%",
        end: "bottom top",
        onToggle: (t) => cleanDark("descent", t.isActive),
      });
      return () => {
        st.kill();
        cleanDark.leave("descent");
      };
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        iris,
        { clipPath: "circle(0.6% at 50% 34%)" },
        {
          clipPath: "circle(150% at 50% 34%)",
          ease: "power2.in",
          scrollTrigger: {
            trigger: root,
            start: "top 92%",
            end: "top 8%",
            scrub: 0.5,
            onUpdate: (st) => root.toggleAttribute("data-open", st.progress > 0.55),
          },
        },
      );
      // once the dark reaches the top of the frame, the chrome's phone scrims
      // go back to the site's black (ai.css, data-clean-dark). The attribute
      // is shared with the page's other dark moments, so it goes through
      // cleanDark under this section's own key.
      ScrollTrigger.create({
        trigger: root,
        start: "top 12%",
        end: "bottom top",
        onToggle: (st) => cleanDark("descent", st.isActive),
      });
    }, root);
    return () => {
      ctx.revert();
      cleanDark.leave("descent");
    };
  }, []);

  return (
    // data-no-fade: the site's content mask would feather the dark into the
    // paper at the frame's edges; the dark runs edge to edge instead (the
    // chrome is back to white over it, data-clean-dark)
    <div ref={rootRef} data-no-fade="" className="ai-descent relative z-10">
      <div ref={irisRef} aria-hidden="true" className="ai-descent__iris">
        <span className="ai-descent__plate" />
        <span className="ai-descent__scrim" />
      </div>
      <div className="ai-descent__content">{children}</div>
    </div>
  );
}
