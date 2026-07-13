"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { defaultReels, type ReelsDoc } from "./reels";

/**
 * Holds the reel library for the page, and — only in draft mode — lets the editor
 * replace it live.
 *
 * In normal mode this is inert: the state is seeded with the JSON that was inlined at
 * build time and nothing ever calls setDoc. The page behaves exactly as it did when
 * the arrays were module-level consts, and no editor code runs.
 *
 * In draft mode (?__draft=1, which only the editor's iframe ever requests) it listens
 * for the parent window pushing a new document over postMessage and re-renders. That
 * is the whole live-preview mechanism: no rebuild, no server round-trip, no second
 * "preview" implementation to drift out of sync with the real page. The preview IS
 * the page.
 */

const ReelsContext = createContext<ReelsDoc>(defaultReels);

export function useReels(): ReelsDoc {
  return useContext(ReelsContext);
}

/** Messages the editor shell sends into the preview iframe. */
type InboundMessage =
  | { type: "cms:draft"; reels: ReelsDoc }
  | { type: "cms:scrollTo"; id: string };

export default function ReelsProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<ReelsDoc>(defaultReels);
  const [draftMode, setDraftMode] = useState(false);

  useEffect(() => {
    const isDraft = new URLSearchParams(window.location.search).get("__draft") === "1";
    if (!isDraft) return;
    setDraftMode(true);

    const onMessage = (e: MessageEvent) => {
      // Same-origin only. The preview is same-origin today, but validating means the
      // iframe can be moved to a sandbox origin later without opening a hole now.
      if (e.origin !== window.location.origin) return;

      const msg = e.data as InboundMessage;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "cms:draft" && msg.reels) {
        setDoc(msg.reels);
      } else if (msg.type === "cms:scrollTo") {
        document
          .querySelector(`[data-cms-id="${CSS.escape(msg.id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    window.addEventListener("message", onMessage);
    // Tell the shell we're mounted and ready to receive a draft.
    window.parent?.postMessage({ type: "cms:ready" }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <ReelsContext.Provider value={doc}>
      {children}
      {draftMode && <DraftOutline />}
    </ReelsContext.Provider>
  );
}

/**
 * Hover-outline + click-to-select inside the preview.
 *
 * Draws an absolutely-positioned box over whatever the cursor is on — it never touches
 * the target's own styles, so it cannot perturb the layout it is meant to be showing.
 * Clicks are swallowed in the capture phase so selecting a reel in the preview doesn't
 * navigate away or submit the contact form.
 */
function DraftOutline() {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-cms-id]");
      setRect(el ? el.getBoundingClientRect() : null);
    };

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-cms-id]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent?.postMessage(
        { type: "cms:select", id: el.getAttribute("data-cms-id") },
        window.location.origin
      );
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, true); // capture: beat the page's own handlers
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  if (!rect) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: "2px solid #00b4d8",
        borderRadius: 6,
        background: "rgba(0,180,216,0.08)",
        pointerEvents: "none",
        zIndex: 2147483647,
        transition: "all 90ms cubic-bezier(0.22,1,0.36,1)",
      }}
    />
  );
}
