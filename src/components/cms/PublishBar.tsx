"use client";

import { useState } from "react";

type Status =
  | { phase: "idle" }
  | { phase: "publishing" }
  | { phase: "done"; url: string; noop: boolean }
  | { phase: "error"; message: string; issues?: string[] };

export default function PublishBar({
  dirty,
  saving,
  savedAt,
  persistentDraft,
  onPublished,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  persistentDraft: boolean;
  onPublished: () => void;
}) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  const publish = async () => {
    if (status.phase === "publishing") return;
    setStatus({ phase: "publishing" });

    try {
      const res = await fetch("/api/cms/publish", {
        method: "POST",
        headers: { "x-triseno-cms": "1" },
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ phase: "error", message: data.error ?? "Publish failed.", issues: data.issues });
        return;
      }

      setStatus({ phase: "done", url: data.url ?? "", noop: Boolean(data.noop) });
      onPublished();
    } catch {
      setStatus({ phase: "error", message: "Couldn't reach the server." });
    }
  };

  const saveLabel = saving
    ? "Saving…"
    : savedAt
      ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : dirty
        ? "Unsaved"
        : "No changes";

  return (
    <header className="cms-top">
      <div className="cms-brand">
        <span className="cms-pip" />
        Triseno CMS
      </div>

      <div className="cms-top-status">
        {!persistentDraft && (
          <span className="cms-badge cms-badge-warn" title="Set UPSTASH_REDIS_REST_URL and _TOKEN">
            Drafts not saved to server
          </span>
        )}
        <span className="cms-muted">{saveLabel}</span>
      </div>

      <div className="cms-top-actions">
        {status.phase === "done" && (
          <span className="cms-badge cms-badge-ok">
            {status.noop ? "Already up to date" : "Published — live in ~1 min"}
          </span>
        )}
        {status.phase === "error" && (
          <span className="cms-badge cms-badge-danger" title={status.issues?.join("\n")}>
            {status.message}
          </span>
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
          {status.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
