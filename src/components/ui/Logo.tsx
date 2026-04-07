"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { SPRING } from "@/lib/animations";

interface LogoProps {
  variant: "navbar" | "footer";
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Logo({ variant, href, onClick }: LogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const isNavbar = variant === "navbar";

  const motionProps = shouldReduceMotion
    ? {}
    : {
        whileHover: { scale: 1.04, transition: SPRING },
        whileTap: isNavbar
          ? { scale: 0.97, transition: SPRING }
          : undefined,
      };

  const content = isNavbar ? (
    <div className="logo-emblem">
      <Image
        src="/images/triseno-logo.png"
        alt="Triseno Systems"
        width={200}
        height={200}
        className="h-[52px] w-auto object-contain relative z-10"
        priority
      />
    </div>
  ) : (
    <div className="logo-emblem logo-emblem--footer">
      <Image
        src="/images/triseno-logo.png"
        alt="Triseno Systems"
        width={200}
        height={200}
        className="h-16 w-auto object-contain relative z-10"
      />
    </div>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={onClick}
        className="flex-shrink-0 group"
        style={{
          background: "none",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          borderRadius: 0,
          padding: 0,
        }}
        {...motionProps}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.div
      className="inline-block group"
      style={{
        background: "none",
        backgroundColor: "transparent",
        border: "none",
        boxShadow: "none",
        borderRadius: 0,
        padding: 0,
      }}
      {...motionProps}
    >
      {content}
    </motion.div>
  );
}
