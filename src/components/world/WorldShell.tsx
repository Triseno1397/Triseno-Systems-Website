"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isRevampedRoute } from "@/lib/divisions";
import WarpProvider from "./WarpProvider";
import Chrome from "./Chrome";
import OrbCursor from "./OrbCursor";
import SmoothScroll from "./SmoothScroll";

/**
 * Global foundation. The warp transition wraps every route so travel works in
 * both directions. Chrome, orb cursor and Lenis only mount on routes already
 * rebuilt on the revamp foundation (isRevampedRoute) — the legacy /portfolio
 * reels page and the CMS (/edit) keep their own navigation and native cursor.
 */
export default function WorldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const world = isRevampedRoute(pathname);

  return (
    <WarpProvider>
      {children}
      {world ? (
        <>
          <SmoothScroll />
          <Chrome />
          <OrbCursor />
        </>
      ) : null}
    </WarpProvider>
  );
}
