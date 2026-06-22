"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import Logo from "@/components/ui/Logo";

// "Monolith Split" branding lockup motion — the divider slices down, then the
// two HUD lines resolve from a left-to-right blur-to-clear, staggered after the
// logo has settled on load.
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const brandContainer: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.45, staggerChildren: 0.16 } },
};

const dividerVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  show: { scaleY: 1, opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

const brandTextWrap: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const brandLine: Variants = {
  hidden: { opacity: 0, x: -10, filter: "blur(8px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE_OUT } },
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const reduceMotion = useReducedMotion();
  const showDivision =
    pathname === "/web-design" || pathname.startsWith("/web-design/");

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 z-50 overflow-visible bg-transparent">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 overflow-visible">
          <div className="flex items-center justify-between h-28 overflow-visible">
            {/* Branding lockup — logo with dedicated breathing room; on the
                web-design division route a vertical gradient divider and a
                premium HUD label split off to the right ("Monolith Split"). */}
            <div className="flex items-center self-start mt-3 overflow-visible">
              <Logo variant="navbar" href="/" />

              {showDivision && (
                <motion.div
                  className="ml-1 hidden items-center gap-4 md:flex lg:ml-3 lg:gap-5"
                  variants={brandContainer}
                  initial={reduceMotion ? false : "hidden"}
                  animate="show"
                >
                  <motion.span
                    aria-hidden="true"
                    variants={dividerVariants}
                    className="block w-px"
                    style={{
                      height: 46,
                      transformOrigin: "top",
                      background:
                        "linear-gradient(180deg, rgba(0,229,255,0) 0%, rgba(0,229,255,0.55) 42%, rgba(157,92,255,0.5) 64%, rgba(157,92,255,0) 100%)",
                    }}
                  />
                  <motion.div
                    className="flex flex-col gap-[5px]"
                    variants={brandTextWrap}
                  >
                    <motion.span
                      variants={brandLine}
                      className="font-mono text-[10px] uppercase leading-none tracking-[0.3em] text-white/40 whitespace-nowrap"
                    >
                      Triseno Systems //
                    </motion.span>
                    <motion.span
                      variants={brandLine}
                      className="font-mono text-[11px] uppercase leading-none tracking-[0.32em] whitespace-nowrap"
                      style={{
                        color: "#9fe9ff",
                        textShadow: "0 0 12px rgba(0,229,255,0.45)",
                      }}
                    >
                      Web Design Division
                    </motion.span>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative text-sm transition-colors duration-200 group ${
                      active
                        ? "text-text-primary"
                        : "text-text-secondary hover:text-[#00e5ff]"
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 h-px bg-cyan-400 transition-all duration-300 ${
                        active ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                    />
                  </Link>
                );
              })}

              {/* Sub-brand — the Web Design division gets its own accented
                  entry, divided off from the core nav with a cyan→violet
                  identity so it reads as a separate wing of Triseno. */}
              <span aria-hidden="true" className="h-5 w-px bg-white/15" />
              <a
                href="/web-design-division"
                target="_self"
                className={`group relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-300 ${
                  showDivision
                    ? "border-[#9d5cff]/55 bg-[#9d5cff]/[0.08] shadow-[0_0_24px_rgba(157,92,255,0.18)]"
                    : "border-white/10 bg-white/[0.03] hover:border-[#9d5cff]/50 hover:bg-[#9d5cff]/[0.06] hover:shadow-[0_0_22px_rgba(157,92,255,0.18)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg,#00e5ff,#9d5cff)",
                    boxShadow: "0 0 8px rgba(157,92,255,0.7)",
                  }}
                />
                <span
                  className="bg-clip-text font-medium text-transparent"
                  style={{ backgroundImage: "linear-gradient(110deg,#9fe9ff,#c9a4ff)" }}
                >
                  Web Design
                </span>
              </a>
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-text-primary relative z-[60] inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 [touch-action:manipulation]"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>

        {/* Hairline gradient line at bottom of nav */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(10,14,26,0.3) 20%, rgba(0,180,216,0.3) 50%, rgba(120,80,200,0.3) 80%, transparent 100%)",
            opacity: 0.3,
          }}
        />
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-navy-950/95 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            <nav className="flex flex-col items-center gap-8">
              {navLinks.map((link, i) => {
                const active = isActive(pathname, link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`text-2xl font-medium transition-colors ${
                        active
                          ? "text-cyan-400"
                          : "text-text-primary hover:text-[#00e5ff]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              {/* Sub-brand division entry — set apart with a divider and the
                  cyan→violet identity. */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-4 pt-2"
              >
                <span aria-hidden="true" className="h-px w-10 bg-white/15" />
                <a
                  href="/web-design-division"
                  target="_self"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-2.5 rounded-full border border-[#9d5cff]/40 bg-[#9d5cff]/[0.08] px-5 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#00e5ff,#9d5cff)",
                      boxShadow: "0 0 10px rgba(157,92,255,0.7)",
                    }}
                  />
                  <span
                    className="bg-clip-text text-xl font-medium text-transparent"
                    style={{ backgroundImage: "linear-gradient(110deg,#9fe9ff,#c9a4ff)" }}
                  >
                    Web Design Division
                  </span>
                </a>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
