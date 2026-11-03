"use client";

import "../../app/explore.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { WarpLink } from "./WarpProvider";
import { EXHIBITS, PAGE_NAMES, exhibitFor, exhibitNo, type Exhibit } from "@/lib/exhibits";

/**
 * Inspect mode (localhost concept, port 3402 or ?explore=inspect).
 *
 * One toggle in the corner. Off, the site is untouched. On, the screen
 * becomes a viewfinder (four corner marks, a thin label along the top) and a
 * placard follows whatever exhibit is under the middle of the screen: its
 * number in the collection, what it is, how it moves, what it would do on
 * your site, and, for the hands-on ones, what to try. "Add to my site" keeps
 * it on a list that rides along with you; the list opens the contact form
 * already filled in with what you picked.
 *
 * The mode and the list persist (session and local storage), so they follow
 * the visitor between pages.
 */

const MODE_KEY = "triseno:inspect";
const LIST_KEY = "triseno:build";

const idOf = (e: Exhibit) => `${e.page}|${e.rail}`;

function loadList(): string[] {
  try {
    const raw = window.localStorage.getItem(LIST_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.filter((id) => EXHIBITS.some((e) => idOf(e) === id));
  } catch {
    return [];
  }
}

export default function Inspect() {
  const pathname = usePathname() ?? "/";
  const [on, setOn] = useState(false);
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [list, setList] = useState<string[]>([]);
  const railRef = useRef<string | null>(null);

  useEffect(() => {
    setList(loadList());
    try {
      setOn(window.sessionStorage.getItem(MODE_KEY) === "1");
    } catch {
      // storage blocked: starts off on every page
    }
  }, []);

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        if (next) window.sessionStorage.setItem(MODE_KEY, "1");
        else window.sessionStorage.removeItem(MODE_KEY);
      } catch {
        // storage blocked
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-inspect", on);
    return () => document.documentElement.removeAttribute("data-inspect");
  }, [on]);

  // the exhibit under the middle of the screen, five times a second
  useEffect(() => {
    if (!on) return;
    railRef.current = null;
    setExhibit(null);
    const read = () => {
      const el = document
        .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
        .map((n) => n.closest("main [data-rail]"))
        .find(Boolean);
      const rail = el?.getAttribute("data-rail") ?? null;
      if (rail === railRef.current) return;
      railRef.current = rail;
      setExhibit(exhibitFor(pathname, rail));
    };
    read();
    const id = window.setInterval(read, 200);
    return () => window.clearInterval(id);
  }, [on, pathname]);

  const save = (next: string[]) => {
    setList(next);
    try {
      window.localStorage.setItem(LIST_KEY, JSON.stringify(next));
    } catch {
      // storage blocked: the list lasts for this page
    }
  };

  const added = exhibit ? list.includes(idOf(exhibit)) : false;
  const flip = () => {
    if (!exhibit) return;
    const id = idOf(exhibit);
    save(added ? list.filter((x) => x !== id) : [...list, id]);
  };

  const brief = list
    .map((id) => EXHIBITS.find((e) => idOf(e) === id))
    .filter((e): e is Exhibit => !!e)
    .map((e) => e.title)
    .join(", ");
  const contactHref = `/contact?division=web&build=${encodeURIComponent(brief)}`;

  return (
    <>
      {on ? (
        <div className="inspect-frame" aria-hidden="true">
          <i className="inspect-frame__c inspect-frame__c--tl" />
          <i className="inspect-frame__c inspect-frame__c--tr" />
          <i className="inspect-frame__c inspect-frame__c--bl" />
          <i className="inspect-frame__c inspect-frame__c--br" />
          <span className="inspect-frame__label font-mono">
            Inspect mode · {PAGE_NAMES[pathname] ?? ""} · scroll to inspect each exhibit
          </span>
        </div>
      ) : null}

      {on ? (
        <section className="inspect-card" aria-label="Exhibit label" aria-live="polite">
          {exhibit ? (
            <div key={idOf(exhibit)} className="inspect-card__body">
              <p className="inspect-card__no font-mono">
                Exhibit {String(exhibitNo(exhibit)).padStart(2, "0")} <span>/ {EXHIBITS.length}</span>
              </p>
              <h2 className="inspect-card__title font-display">{exhibit.title}</h2>
              <p className="inspect-card__kind">{exhibit.kind}</p>
              <dl className="inspect-card__rows">
                <div>
                  <dt className="font-mono">On your site</dt>
                  <dd>{exhibit.goodFor}</dd>
                </div>
              </dl>
              {exhibit.tryIt ? (
                <p className="inspect-card__try font-mono">
                  <i aria-hidden="true" /> Try it: {exhibit.tryIt}
                </p>
              ) : null}
              <button type="button" className="inspect-card__add font-mono" data-added={added ? "" : undefined} onClick={flip}>
                {added ? "On your list · remove" : "Add to my site"}
              </button>
            </div>
          ) : (
            <div className="inspect-card__body">
              <p className="inspect-card__no font-mono">Between exhibits</p>
              <p className="inspect-card__empty">Scroll to bring the next exhibit to the middle of the screen.</p>
            </div>
          )}
          <footer className="inspect-card__list">
            <span className="font-mono">
              Your site · <b>{list.length}</b> {list.length === 1 ? "exhibit" : "exhibits"}
            </span>
            {list.length ? (
              <WarpLink href={contactHref} className="inspect-card__send font-mono">
                Send us the list
              </WarpLink>
            ) : null}
          </footer>
        </section>
      ) : null}

      <button type="button" className="inspect-toggle font-mono" aria-pressed={on} onClick={toggle}>
        <span className="inspect-toggle__mark" aria-hidden="true" />
        {on ? "Inspecting" : "Inspect"}
      </button>
    </>
  );
}
