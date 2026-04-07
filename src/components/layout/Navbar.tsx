"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X, PenNib } from "@phosphor-icons/react";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";

const WD_TEXT = "Web Design Division";

function CyclingText({ text, className }: { text: string; className?: string }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timeout: ReturnType<typeof setTimeout>;
    let letterIndex = 0;

    const runCycle = () => {
      // Light up letters one by one
      const stepLetter = () => {
        setActiveIndex(letterIndex);
        letterIndex++;
        if (letterIndex < text.length) {
          timeout = setTimeout(stepLetter, 60);
        } else {
          // Hold last letter briefly, then reset and wait
          timeout = setTimeout(() => {
            setActiveIndex(-1);
            letterIndex = 0;
            timeout = setTimeout(runCycle, 3000);
          }, 400);
        }
      };
      stepLetter();
    };

    // Initial delay before first cycle
    timeout = setTimeout(runCycle, 1500);

    return () => clearTimeout(timeout);
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={`wd-letter inline-block transition-all duration-200 ${
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
  { label: "Home", href: "#home" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Process", href: "#process" },
  { label: "Work", href: "#showcase" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigate = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        // On a different page — go back to home with the hash
        window.location.href = "/" + href;
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <Logo
              variant="navbar"
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                navigate("#home");
              }}
            />

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.href);
                  }}
                  className="relative text-sm text-text-secondary hover:text-text-primary transition-colors duration-300 group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}

              {/* Divider */}
              <div className="w-px h-5 bg-white/[0.08]" />

              {/* Web Design Division — featured link */}
              <a
                href="/web-design"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/web-design");
                }}
                className="wd-nav-link group relative isolate flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white/90 transition-all duration-300 hover:text-white"
              >
                {/* Gradient border via pseudo-element */}
                <span className="absolute inset-0 rounded-full border border-white/20 transition-all duration-300 group-hover:border-cyan-400/50" />

                {/* Glow background on hover */}
                <span className="absolute inset-0 rounded-full bg-cyan-400/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Shimmer sweep */}
                <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <span className="wd-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/[0.08] to-transparent" />
                </span>

                <PenNib size={14} weight="duotone" className="relative z-10 text-cyan-400" />
                <CyclingText text={WD_TEXT} className="relative z-10" />
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Button
                variant="primary"
                href="#contact"
                size="default"
              >
                Start a Conversation
              </Button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-text-primary p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
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
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.href);
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="text-2xl font-medium text-text-primary hover:text-cyan-400 transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: navLinks.length * 0.1, duration: 0.4 }}
                className="w-16 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
              />

              {/* Web Design Division — featured mobile link */}
              <motion.a
                href="/web-design"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/web-design");
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: (navLinks.length + 0.5) * 0.1,
                  duration: 0.4,
                }}
                className="relative flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 text-white/90 text-xl font-medium hover:border-cyan-400/50 hover:bg-cyan-400/[0.06] hover:text-white transition-all duration-300"
              >
                <PenNib size={20} weight="duotone" className="text-cyan-400" />
                <CyclingText text={WD_TEXT} />
              </motion.a>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: (navLinks.length + 1) * 0.1,
                  duration: 0.4,
                }}
              >
                <Button
                  variant="primary"
                  size="large"
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                >
                  Start a Conversation
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
