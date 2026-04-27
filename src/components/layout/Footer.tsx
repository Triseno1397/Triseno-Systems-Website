"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "Process", href: "/process" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
  { label: "Web Design Division", href: "/web-design" },
];

const serviceLinks = [
  { label: "Multi-agent orchestration", href: "/capabilities#orchestration" },
  { label: "Workflow compression", href: "/capabilities#compression" },
  { label: "Decision-layer automation", href: "/capabilities#decision-intelligence" },
  { label: "Product & catalog intelligence", href: "/capabilities#catalog-intelligence" },
  { label: "Broadcast & production AI", href: "/capabilities#broadcast-ai" },
  { label: "Revenue operations", href: "/capabilities#revenue-ops" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-navy-900">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-16">
        {/* Brand row */}
        <div className="mb-12 flex flex-col gap-4 max-w-md">
          <Logo variant="footer" />
          <p className="text-sm text-text-secondary leading-relaxed">
            AI infrastructure for operations, intelligence, and scale.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-5 tracking-wider uppercase">
              Navigation
            </h4>
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-[#00e5ff] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-5 tracking-wider uppercase">
              Services
            </h4>
            <ul className="space-y-3">
              {serviceLinks.map((service) => (
                <li key={service.href}>
                  <Link
                    href={service.href}
                    className="text-sm text-text-secondary hover:text-[#00e5ff] transition-colors duration-200"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-5 tracking-wider uppercase">
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:Tristen@trisenosystems.com"
                  className="text-sm text-text-secondary hover:text-[#00e5ff] transition-colors duration-200"
                >
                  Tristen@trisenosystems.com
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-text-secondary hover:text-[#00e5ff] transition-colors duration-200"
                >
                  Start a conversation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-tertiary">
            &copy; 2026 Triseno Systems. All rights reserved.
          </p>
          <p className="text-xs text-text-tertiary font-mono tracking-wider">
            Tristen@trisenosystems.com
          </p>
        </div>
      </div>
    </footer>
  );
}
