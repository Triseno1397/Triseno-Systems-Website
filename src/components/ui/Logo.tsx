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
        whileHover: { scale: 1.08, transition: SPRING },
        whileTap: isNavbar ? { scale: 0.96, transition: SPRING } : undefined,
      };

  const content = (
    <div className={`logo-emblem ${isNavbar ? "logo-emblem--nav" : "logo-emblem--footer"}`}>
      {/* Ambient scanner line */}
      {!shouldReduceMotion && <span className="logo-scanline" />}

      <Image
        src="/images/triseno-logo.png"
        alt="Triseno Systems"
        width={400}
        height={300}
        className={`object-contain object-top relative z-10 ${
          isNavbar ? "h-[72px] w-auto" : "h-[64px] w-auto"
        }`}
        priority={isNavbar}
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
          lineHeight: 0,
          fontSize: 0,
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
        lineHeight: 0,
        fontSize: 0,
      }}
      {...motionProps}
    >
      {content}
    </motion.div>
  );
}
