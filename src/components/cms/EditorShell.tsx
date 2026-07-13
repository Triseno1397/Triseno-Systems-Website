"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Format, ReelsDoc } from "@/content/reels";
import { defaultReels } from "@/content/reels";
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
 */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTH: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1440 };

type PreviewPage = "studio" | "portfolio";

export default function EditorShell({ persistentDraft }: { persistentDraft: boolean }) {
  const [doc, setDoc] = useState<ReelsDoc>(defaultReels);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState<PreviewPage>("studio");
  const [device, setDevice] = useState<Device>("desktop");
  const [selected, setSelected] = useState<number | null>(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeReady = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load the working draft (or the published content if there isn't one). ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cms/draft");
        if (res.ok) {
          const data = await res.json();
          if (data.draft?.reels) {
            setDoc(data.draft.reels as ReelsDoc);
            setDirty(Boolean(data.isDraft));
            setSavedAt(data.draft.updatedAt || null);
          }
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

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

  /* ── Listen to the preview: it tells us when it's ready, and what got clicked. ── */
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

  /* ── Autosave, debounced. ── */
  const scheduleSave = useCallback((next: ReelsDoc) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch("/api/cms/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-triseno-cms": "1" },
          body: JSON.stringify({ reels: next }),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedAt(data.updatedAt);
        }
      } finally {
        setSaving(false);
      }
    }, 800);
  }, []);

  const update = useCallback(
    (next: ReelsDoc) => {
      setDoc(next);
      setDirty(true);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  const updateFormat = useCallback(
    (index: number, patch: Partial<Format>) => {
      const formats = doc.formats.map((f, i) => (i === index ? { ...f, ...patch } : f));
      update({ ...doc, formats });
    },
    [doc, update]
  );

  /* ── Reordering: studioOrder is the source of truth for the Studio page. ── */
  const moveInStudioOrder = useCallback(
    (formatId: string, direction: -1 | 1) => {
      const order = [...doc.studioOrder];
      const from = order.indexOf(formatId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) return;
      [order[from], order[to]] = [order[to], order[from]];
      update({ ...doc, studioOrder: order });
    },
    [doc, update]
  );

  const orderedFormats = useMemo(() => {
    const byId = new Map(doc.formats.map((f, i) => [f.id, i]));
    return doc.studioOrder
      .map((id) => {
        const i = byId.get(id);
        return i === undefined ? null : { format: doc.formats[i], index: i };
      })
      .filter((x): x is { format: Format; index: number } => x !== null);
  }, [doc]);

  const previewSrc = `/${page}?__draft=1`;

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
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        persistentDraft={persistentDraft}
        onPublished={() => setDirty(false)}
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
              No onLoad handler here, deliberately. Resetting the ready flag on load
              looks right and is a trap: `load` fires on *window load*, which on a page
              carrying ~90MB of autoplaying video lands long after React has hydrated
              and already posted cms:ready. It therefore clobbers the flag back to false
              *after* the preview was ready, and every subsequent edit is silently
              dropped — the preview freezes at its initial content and nothing errors.
              Readiness is owned solely by the iframe's own cms:ready message, and reset
              only when we deliberately swap pages.
            */}
            <iframe
              ref={iframeRef}
              key={page}
              src={previewSrc}
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
