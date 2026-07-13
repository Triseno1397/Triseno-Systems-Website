"use client";

import type { Clip, Format } from "@/content/reels";

/**
 * Edits one reel format. Every keystroke flows straight into the preview, so he is
 * always looking at the real page rather than a form and a hope.
 */
export default function ReelInspector({
  format,
  onChange,
}: {
  format: Format;
  onChange: (patch: Partial<Format>) => void;
}) {
  const setClip = (i: number, patch: Partial<Clip>) => {
    onChange({
      clips: format.clips.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  };

  const removeClip = (i: number) => {
    onChange({ clips: format.clips.filter((_, j) => j !== i) });
  };

  const addClip = () => {
    onChange({
      clips: [
        ...format.clips,
        { src: "", label: null, caption: "", audio: false },
      ],
    });
  };

  return (
    <div className="cms-pane">
      <div className="cms-pane-head">
        <span className="cms-pane-eyebrow">Reel</span>
        <h2>{format.title || "Untitled"}</h2>
      </div>

      <div className="cms-pane-body">
        <label className="cms-field">
          <span className="cms-label">Title</span>
          <input
            className="cms-input"
            value={format.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>

        <label className="cms-field">
          <span className="cms-label">Tagline</span>
          <input
            className="cms-input"
            value={format.tagline}
            onChange={(e) => onChange({ tagline: e.target.value })}
          />
          <span className="cms-help">The one-liner under the title on the Studio page.</span>
        </label>

        <label className="cms-field">
          <span className="cms-label">Description</span>
          <textarea
            className="cms-textarea"
            rows={5}
            value={format.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </label>

        <label className="cms-field">
          <span className="cms-label">Aspect ratio</span>
          <select
            className="cms-select"
            value={format.ratio}
            onChange={(e) => onChange({ ratio: e.target.value })}
          >
            {["9:16", "16:9", "1:1", "4:5", "2.39:1"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="cms-help">
            Drives the tile shape. It sets CSS aspect-ratio, so the layout is correct
            before the video has even loaded.
          </span>
        </label>

        <label className="cms-field">
          <span className="cms-label">Tags</span>
          <input
            className="cms-input"
            value={format.tags.join(", ")}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
          <span className="cms-help">Comma-separated.</span>
        </label>

        <div className="cms-divider" />

        <div className="cms-sub-head">
          <span>Clips</span>
          <button type="button" className="cms-btn cms-btn-sm" onClick={addClip}>
            Add clip
          </button>
        </div>

        {format.clips.length === 0 && (
          <p className="cms-help">
            No clip yet — this format falls back to the gradient thumbnail on Studio and
            does not appear on the Work page at all.
          </p>
        )}

        {format.clips.map((clip, i) => (
          <div className="cms-card" key={i}>
            <div className="cms-card-head">
              <span>Clip {i + 1}</span>
              <button
                type="button"
                className="cms-link-danger"
                onClick={() => removeClip(i)}
              >
                Remove
              </button>
            </div>

            <label className="cms-field">
              <span className="cms-label">Video</span>
              <input
                className="cms-input"
                value={clip.src}
                placeholder="/videos/example.mp4"
                onChange={(e) => setClip(i, { src: e.target.value })}
              />
            </label>

            <label className="cms-field">
              <span className="cms-label">Work-page caption</span>
              <input
                className="cms-input"
                value={clip.caption}
                onChange={(e) => setClip(i, { caption: e.target.value })}
              />
            </label>

            {format.clips.length > 1 && (
              <label className="cms-field">
                <span className="cms-label">Cell label</span>
                <input
                  className="cms-input"
                  value={clip.label ?? ""}
                  onChange={(e) => setClip(i, { label: e.target.value || null })}
                />
                <span className="cms-help">
                  Shown under each clip when a format has two side by side.
                </span>
              </label>
            )}

            <label className="cms-check">
              <input
                type="checkbox"
                checked={clip.audio}
                onChange={(e) => setClip(i, { audio: e.target.checked })}
              />
              <span>Has sound (shows the unmute button)</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
