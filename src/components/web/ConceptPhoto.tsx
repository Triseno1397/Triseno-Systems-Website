"use client";

/**
 * Hero photography for a fictional concept site (public/concepts/<slug>.webp).
 *
 * Defensive by design (design-loop/world-plates.md: some art is still
 * rendering): it lazy-loads, decodes off the main thread, and removes itself
 * if the file is missing, so the concept’s CSS-drawn art underneath shows
 * instead. A missing photo never leaves a broken image or a hole.
 * An `alt=""` image that fails before hydration also renders as nothing.
 */
export default function ConceptPhoto({
  slug,
  className = "",
  position,
}: {
  slug: string;
  className?: string;
  /** object-position, to keep the subject in frame when cropped */
  position?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- depicted photo inside a container-sized mock; must remove itself on error
    <img
      className={`rc-photo ${className}`}
      src={`/concepts/${slug}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      style={position ? { objectPosition: position } : undefined}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
