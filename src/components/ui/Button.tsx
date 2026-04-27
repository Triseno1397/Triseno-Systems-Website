"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "large";
  href?: string;
  onClick?: () => void;
  className?: string;
}

const variants = {
  primary:
    "bg-gradient-to-r from-cyan-400 to-cyan-600 text-navy-950 font-semibold shadow-[0_0_30px_rgba(0,180,216,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]",
  secondary:
    "border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/60 hover:text-[#00e5ff]",
  ghost:
    "text-text-secondary hover:text-text-primary",
};

const sizes = {
  default: "px-6 py-3 text-sm",
  large: "px-8 py-4 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "default",
  href,
  onClick,
  className = "",
}: ButtonProps) {
  const baseClasses = `inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    const isHash = href.startsWith("#");
    const isExternal = /^https?:\/\//.test(href);

    if (isHash) {
      return (
        <a
          href={href}
          className={baseClasses}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(href.slice(1));
            el?.scrollIntoView({ behavior: "smooth" });
            onClick?.();
          }}
        >
          {children}
        </a>
      );
    }

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
          onClick={onClick}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={baseClasses} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <motion.button
      className={baseClasses}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}
