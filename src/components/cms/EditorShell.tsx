"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Format, ReelsDoc } from "@/content/reels";
import ReelInspector from "./ReelInspector";
import PublishBar from "./PublishBar";

/**
 * The editor. Three panes: reel list, live preview, inspector.
 *
 * The preview is a real iframe of the real page at ?__draft=1, not a re-implementation.
 * That is deliberate: the site installs a full-viewport curtain, a custom cursor, fixed
 * navs, overflow-x:hidden and page-scoped global CSS, and rendering it inside editor
 * chrome would be a permanent CSS and event-handler war. An iframe gives real isolation,
 * true responsive widths for the device toggle, and — most importantly — guarantees that
 * what he sees is what visitors get, because it IS what visitors get.
 *
 * The draft lives in localStorage, not on a server. That is what lets this whole CMS run
 * with no database and no third-party service: the content only leaves the browser when
 * he presses Publish, which sends it to /api/cms/publish and straight into a git commit.
 * The trade-off is honest and stated in the UI — a draft does not follow him to another
 * device.
 */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTH: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1440 };

type PreviewPage = "studio" | "portfolio";

const DRAFT_KEY = "triseno:cms:draft:reels";

export default function EditorShell({ published }: { published: ReelsDoc }) {
  const [doc, setDoc] = useState<ReelsDoc>(published);
  const [loaded, setLoaded] = useState(false);

  const [page, setPage] = useState<PreviewPage>("studio");
  const [device, setDevice] = useState<Device>("desktop");
  const [selected, setSelected] = useState<number | null>(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeReady = useRef(false);

  /** Anything unsaved? Compare against what is actually published, not a dirty flag —
   *  a flag would keep claiming "unsaved" after he undid his own change by hand. */
  const dirty = useMemo(
    () => JSON.stringify(doc) !== JSON.stringify(published),
    [doc, published]
  );

  /* ── Restore a draft from this browser, if there is one. ── */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReelsDoc;
        if (parsed?.formats?.length) setDoc(parsed);
      }
    } catch {
      // A corrupt draft must not brick the editor — fall back to published content.
      window.localStorage.removeItem(DRAFT_KEY);
    }
    setLoaded(true);
  }, []);

  /* ── Persist every change locally. ── */
  useEffect(() => {
    if (!loaded) return;
    try {
      if (dirty) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
      else window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Quota or private mode. The editor still works; the draft just won't survive a
      // reload, which is better than crashing mid-edit.
    }
  }, [doc, dirty, loaded]);

  /* ── Push the document into the preview whenever it changes. ── */
  const pushToPreview = useCallback((next: ReelsDoc) => {
    if (!iframeReady.current) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "cms:draft", reels: next },
      window.location.origin
    );
  }, []);

  useEffect(() => {
    if (loaded) pushToPreview(doc);
  }, [doc, loaded, pushToPreview]);

  /* ── Listen to the preview: it says when it's ready, and what got clicked. ── */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "cms:ready") {
        iframeReady.current = true;
        pushToPreview(doc);
      } else if (msg.type === "cms:select" && typeof msg.id === "string") {
        // "studio:reel:3" / "work:tile:5" → select the underlying format.
        const [scope, , rawIndex] = msg.id.split(":");
        const index = Number(rawIndex);
        if (Number.isNaN(index)) return;

        if (scope === "studio") {
          const formatId = doc.studioOrder[index];
          const i = doc.formats.findIndex((f) => f.id === formatId);
          if (i >= 0) setSelected(i);
        } else if (scope === "work") {
          const tile = doc.workTiles[index];
          const i = doc.formats.findIndex((f) => f.id === tile?.reel);
          if (i >= 0) setSelected(i);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [doc, pushToPreview]);

  const updateFormat = useCallback(
    (index: number, patch: Partial<Format>) => {
      setDoc((d) => ({
        ...d,
        formats: d.formats.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      }));
    },
    []
  );

  const moveInStudioOrder = useCallback((formatId: string, direction: -1 | 1) => {
    setDoc((d) => {
      const order = [...d.studioOrder];
      const from = order.indexOf(formatId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) return d;
      [order[from], order[to]] = [order[to], order[from]];
      return { ...d, studioOrder: order };
    });
  }, []);

  const discard = useCallback(() => {
    window.localStorage.removeItem(DRAFT_KEY);
    setDoc(published);
  }, [published]);

  const orderedFormats = useMemo(() => {
    const byId = new Map(doc.formats.map((f, i) => [f.id, i]));
    return doc.studioOrder
      .map((id) => {
        const i = byId.get(id);
        return i === undefined ? null : { format: doc.formats[i], index: i };
      })
      .filter((x): x is { format: Format; index: number } => x !== null);
  }, [doc]);

  if (!loaded) {
    return (
      <div className="cms-loading">
        <span className="cms-spinner" />
        Loading editor…
      </div>
    );
  }

  return (
    <>
      <PublishBar
        doc={doc}
        dirty={dirty}
        onDiscard={discard}
        onPublished={() => {
          // Published content is now what's on screen; clear the local draft so the
          // editor stops reporting unsaved changes.
          window.localStorage.removeItem(DRAFT_KEY);
          window.location.reload();
        }}
      />

      <div className="cms-body">
        {/* ── Left: the reel list, in the order Studio renders them. ── */}
        <aside className="cms-rail">
          <div className="cms-rail-head">
            <span>Reels</span>
            <span className="cms-count">{orderedFormats.length}</span>
          </div>

          <div className="cms-list">
            {orderedFormats.map(({ format, index }, position) => (
              <div
                key={format.id}
                className={`cms-item${selected === index ? " on" : ""}`}
                onClick={() => {
                  setSelected(index);
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: "cms:scrollTo", id: `studio:reel:${position}` },
                    window.location.origin
                  );
                }}
              >
                <span className="cms-item-n">{String(position + 1).padStart(2, "0")}</span>
                <span className="cms-item-body">
                  <span className="cms-item-title">{format.title}</span>
                  <span className="cms-item-sub">
                    {format.clips.length === 0
                      ? "No clip"
                      : `${format.clips.length} clip${format.clips.length > 1 ? "s" : ""}`}
                    {" · "}
                    {format.ratio}
                  </span>
                </span>
                <span className="cms-item-move">
                  <button
                    type="button"
                    aria-label={`Move ${format.title} up`}
                    disabled={position === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveInStudioOrder(format.id, -1);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${format.title} down`}
                    disabled={position === orderedFormats.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveInStudioOrder(format.id, 1);
                    }}
                  >
                    ↓
                  </button>
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Centre: the real page, live. ── */}
        <main className="cms-stage">
          <div className="cms-stage-bar">
            <div className="cms-tabs">
              {(["studio", "portfolio"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cms-tab${page === p ? " on" : ""}`}
                  onClick={() => {
                    iframeReady.current = false;
                    setPage(p);
                  }}
                >
                  {p === "studio" ? "Studio" : "Work"}
                </button>
              ))}
            </div>

            <div className="cms-tabs">
              {(["mobile", "tablet", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`cms-tab${device === d ? " on" : ""}`}
                  onClick={() => setDevice(d)}
                >
                  {d === "mobile" ? "Phone" : d === "tablet" ? "Tablet" : "Desktop"}
                </button>
              ))}
            </div>
          </div>

          <div className="cms-canvas">
            {/*
              No onLoad handler here, deliberately. Resetting the ready flag on load looks
              right and is a trap: `load` fires on *window load*, which on a page carrying
              ~90MB of autoplaying video lands long after React has hydrated and already
              posted cms:ready. It therefore clobbers the flag back to false *after* the
              preview was ready, and every subsequent edit is silently dropped — the
              preview freezes at its initial content and nothing errors. Readiness is owned
              solely by the iframe's own cms:ready message.
            */}
            <iframe
              ref={iframeRef}
              key={page}
              src={`/${page}?__draft=1`}
              title="Live preview"
              className="cms-frame"
              style={{ width: DEVICE_WIDTH[device] }}
            />
          </div>
        </main>

        {/* ── Right: the inspector for whatever is selected. ── */}
        <aside className="cms-inspector">
          {selected !== null && doc.formats[selected] ? (
            <ReelInspector
              format={doc.formats[selected]}
              onChange={(patch) => updateFormat(selected, patch)}
            />
          ) : (
            <div className="cms-empty">Select a reel to edit it.</div>
          )}
        </aside>
      </div>
    </>
  );
}
