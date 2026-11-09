"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isRevampedRoute } from "@/lib/divisions";
import WarpProvider from "./WarpProvider";
import Chrome from "./Chrome";
import OrbCursor from "./OrbCursor";
import SmoothScroll from "./SmoothScroll";
import Discovery from "./Discovery";
import PerfOverlay from "./PerfOverlay";
import Tour from "./Tour";
import Inspect from "./Inspect";
import { exploreVariant, type ExploreVariant } from "@/lib/exhibits";
import { useEffect, useState } from "react";

/**
 * Global foundation. The warp transition wraps every route so travel works in
 * both directions. Chrome, orb cursor and Lenis only mount on routes already
 * rebuilt on the revamp foundation (isRevampedRoute) — the legacy /portfolio
 * reels page and the CMS (/edit) keep their own navigation and native cursor.
 */
export default function WorldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const world = isRevampedRoute(pathname);
  // the launch-spot checkout keeps the chrome but none of the exploring
  // (tour, exhibit counter): one job on that page, reserving a spot
  const checkout = pathname === "/launch" || pathname.startsWith("/launch/");
  // the two exploring concepts, picked by port on localhost (3401 / 3402)
  const [explore, setExplore] = useState<ExploreVariant>("none");
  useEffect(() => {
    const v = exploreVariant();
    setExplore(v);
    document.documentElement.setAttribute("data-explore", v);
  }, []);

  return (
    <WarpProvider>
      {children}
      {world ? (
        <>
          <SmoothScroll />
          <Chrome />
          {checkout ? null : <Discovery />}
          <PerfOverlay />
          {explore === "tour" && !checkout ? <Tour /> : null}
          {explore === "inspect" && !checkout ? <Inspect /> : null}
          <OrbCursor />
        </>
      ) : null}
    </WarpProvider>
  );
}
