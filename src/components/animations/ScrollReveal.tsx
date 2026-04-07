"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { DURATIONS } from "@/lib/animations";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  as?: keyof typeof motion;
}

// Smaller offsets on mobile to reduce paint area and perceived jank
const desktopOffsets = {
  up: { y: 60 },
  down: { y: -60 },
  left: { x: 60 },
  right: { x: -60 },
};

const mobileOffsets = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 24 },
  right: { x: -24 },
};

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = DURATIONS.medium,
  once = true,
  className,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const offsets = isMobile ? mobileOffsets : desktopOffsets;
  const offset = offsets[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-40px" }}
      transition={{
        duration: isMobile ? duration * 0.75 : duration,
        delay: isMobile ? delay * 0.5 : delay,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
