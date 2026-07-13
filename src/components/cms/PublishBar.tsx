"use client";

import { useState } from "react";
import type { ReelsDoc } from "@/content/reels";

type Status =
  | { phase: "idle" }
  | { phase: "publishing" }
  | { phase: "done"; noop: boolean }
  | { phase: "error"; message: string; issues?: string[] };

export default function PublishBar({
  doc,
  dirty,
  onDiscard,
  onPublished,
}: {
  doc: ReelsDoc;
  dirty: boolean;
  onDiscard: () => void;
  onPublished: () => void;
}) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  const publish = async () => {
    if (status.phase === "publishing") return;
    setStatus({ phase: "publishing" });

    try {
      // The draft has lived only in this browser until now. Publishing is what sends it
      // to the server, which validates it and commits it to main.
      const res = await fetch("/api/cms/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-triseno-cms": "1" },
        body: JSON.stringify({ reels: doc }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({
          phase: "error",
          message: data.error ?? "Publish failed.",
          issues: data.issues,
        });
        return;
      }

      setStatus({ phase: "done", noop: Boolean(data.noop) });

      // Give him a beat to read "Published", then reload so the editor's idea of
      // "published content" matches what was just committed.
      setTimeout(onPublished, 2500);
    } catch {
      setStatus({ phase: "error", message: "Couldn't reach the server." });
    }
  };

  return (
    <header className="cms-top">
      <div className="cms-brand">
        <span className="cms-pip" />
        Triseno CMS
      </div>

      <div className="cms-top-status">
        {dirty ? (
          <>
            <span className="cms-badge cms-badge-warn">Unpublished changes</span>
            <button type="button" className="cms-link-danger" onClick={onDiscard}>
              Discard
            </button>
          </>
        ) : (
          <span className="cms-muted">Everything is published</span>
        )}
      </div>

      <div className="cms-top-actions">
        {status.phase === "done" && (
          <span className="cms-badge cms-badge-ok">
            {status.noop ? "Already up to date" : "Published — live in about a minute"}
          </span>
        )}
        {status.phase === "error" && !status.issues?.length && (
          <span className="cms-badge cms-badge-danger">{status.message}</span>
        )}

        <button
          type="button"
          className="cms-btn cms-btn-publish"
          onClick={publish}
          disabled={!dirty || status.phase === "publishing"}
        >
          {status.phase === "publishing" ? "Publishing…" : "Publish"}
        </button>
      </div>

      {status.phase === "error" && status.issues?.length ? (
        <ul className="cms-issues">
          <li>
            <strong>{status.message}</strong>
          </li>
          {status.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
