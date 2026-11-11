"use client";

import { useEffect, useState } from "react";

export interface LaunchSpotsView {
  month: string;
  next: string;
  total: number;
  left: number;
  full: boolean;
  resetLabel: string;
}

let cache: LaunchSpotsView | null = null;

/** The live spot count for the ticker and the menu. One fetch per visit, refreshed every two minutes. */
export function useLaunchSpots(): LaunchSpotsView | null {
  const [spots, setSpots] = useState<LaunchSpotsView | null>(cache);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/launch/spots")
        .then((r) => (r.ok ? (r.json() as Promise<LaunchSpotsView>) : null))
        .then((d) => {
          if (!d || !alive) return;
          cache = d;
          setSpots(d);
        })
        .catch(() => {});
    load();
    const id = window.setInterval(load, 120_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  return spots;
}
