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

  const size = isNavbar ? 80 : 72;

  const motionProps = shouldReduceMotion
    ? {}
    : {
        whileHover: { scale: 1.06, transition: SPRING },
        whileTap: isNavbar
          ? { scale: 0.97, transition: SPRING }
          : undefined,
      };

  const content = (
    <div
      className="logo-emblem"
      style={{ width: size, height: size }}
    >
      {/* Outer orbital ring */}
      {!shouldReduceMotion && (
        <>
          <span className="logo-orbit logo-orbit--1" />
          <span className="logo-orbit logo-orbit--2" />
          <span className="logo-orbit logo-orbit--3" />
        </>
      )}

      {/* Core glow pulse */}
      <span className="logo-core-glow" />

      <Image
        src="/images/triseno-logo.png"
        alt="Triseno Systems"
        width={400}
        height={400}
        className="object-contain relative z-10"
        style={{
          width: size * 0.75,
          height: size * 0.75,
        }}
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
