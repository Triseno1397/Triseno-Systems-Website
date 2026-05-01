"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { List, X, PenNib } from "@phosphor-icons/react";
import Logo from "@/components/ui/Logo";

const WD_TEXT = "Web Design Division";

function CyclingText({ text, className }: { text: string; className?: string }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timeout: ReturnType<typeof setTimeout>;
    let letterIndex = 0;

    const runCycle = () => {
      const stepLetter = () => {
        setActiveIndex(letterIndex);
        letterIndex++;
        if (letterIndex < text.length) {
          timeout = setTimeout(stepLetter, 60);
        } else {
          timeout = setTimeout(() => {
            setActiveIndex(-1);
            letterIndex = 0;
            timeout = setTimeout(runCycle, 3000);
          }, 400);
        }
      };
      stepLetter();
    };

    timeout = setTimeout(runCycle, 1500);
    return () => clearTimeout(timeout);
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={`inline-block transition-all duration-200 ${
            i <= activeIndex
              ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
              : ""
          }`}
          style={{ minWidth: char === " " ? "0.25em" : undefined }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "Process", href: "/process" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 z-50 overflow-visible bg-transparent">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 overflow-visible">
          <div className="flex items-center justify-between h-28 overflow-visible">
            {/* Logo */}
            <div className="self-start mt-3">
              <Logo variant="navbar" href="/" />
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

              {/* Divider */}
              <div className="w-px h-5 bg-white/[0.08]" />

              {/* Web Design Division — featured link */}
              <Link
                href="/web-design"
                className={`wd-nav-link group relative isolate flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive(pathname, "/web-design")
                    ? "text-white"
                    : "text-white/90 hover:text-white"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-full border transition-all duration-300 ${
                    isActive(pathname, "/web-design")
                      ? "border-cyan-400/60"
                      : "border-white/20 group-hover:border-cyan-400/50"
                  }`}
                />
                <span
                  className={`absolute inset-0 rounded-full bg-cyan-400/[0.04] transition-opacity duration-300 ${
                    isActive(pathname, "/web-design")
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />
                <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <span className="wd-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/[0.08] to-transparent" />
                </span>
                <PenNib size={14} weight="duotone" className="relative z-10 text-cyan-400" />
                <CyclingText text={WD_TEXT} className="relative z-10" />
              </Link>
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

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: navLinks.length * 0.1, duration: 0.4 }}
                className="w-16 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
              />

              {/* Web Design Division — featured mobile link */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: (navLinks.length + 0.5) * 0.1,
                  duration: 0.4,
                }}
              >
                <Link
                  href="/web-design"
                  onClick={() => setMobileOpen(false)}
                  className="relative flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 text-white/90 text-xl font-medium hover:border-cyan-400/50 hover:bg-cyan-400/[0.06] hover:text-white transition-all duration-300"
                >
                  <PenNib size={20} weight="duotone" className="text-cyan-400" />
                  <CyclingText text={WD_TEXT} />
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
