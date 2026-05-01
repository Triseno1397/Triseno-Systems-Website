"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  // Note: no AnimatePresence + mode="wait" here. That combo (keyed on
  // pathname) is a known Next.js App Router footgun — the exit animation
  // can leave the new route stuck at opacity:0/y:-10 and never animate in,
  // which is what produced the "blank page until refresh" behavior on
  // /contact. A plain motion.div keyed on pathname gives the same fade-up
  // entrance without the stuck-exit class of bugs.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
