"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Studio", href: "/studio" },
  { label: "Work", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
  { label: "Web Design Division", href: "/web-design-division" },
];

// Studio (content) services route to /studio; the Web Design entry points at
// the static division page in /public.
const studioServices = [
  { label: "Paid Social Creative", href: "/studio" },
  { label: "UGC Ads", href: "/studio" },
  { label: "Short-Form Content", href: "/studio" },
  { label: "Product Video", href: "/studio" },
  { label: "Brand Films", href: "/studio" },
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
            One studio, two divisions — video content for paid social and cinematic,
            conversion-built websites.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-5 tracking-wider uppercase">
              Navigation
            </h4>
            <ul className="space-y-3">
              {navigationLinks.map((link) => {
                const isDivision = link.href === "/web-design-division";
                const className = `inline-flex items-center gap-2 text-sm transition-colors duration-200 ${
                  isDivision
                    ? "text-[#c9a4ff] hover:text-[#d9bcff]"
                    : "text-text-secondary hover:text-[#00e5ff]"
                }`;
                const dot = isDivision && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#00e5ff,#9d5cff)",
                      boxShadow: "0 0 6px rgba(157,92,255,0.6)",
                    }}
                  />
                );
                return (
                  <li key={link.href}>
                    {isDivision ? (
                      // Static playground page lives in /public — full navigation, not Next routing.
                      <a href={link.href} target="_self" className={className}>
                        {dot}
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={className}>
                        {dot}
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-5 tracking-wider uppercase">
              Services
            </h4>
            <ul className="space-y-3">
              {studioServices.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="text-sm text-text-secondary hover:text-[#00e5ff] transition-colors duration-200"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
              <li>
                {/* Static playground page lives in /public — plain anchor, not Next routing. */}
                <a
                  href="/web-design-division"
                  target="_self"
                  className="inline-flex items-center gap-2 text-sm text-[#c9a4ff] hover:text-[#d9bcff] transition-colors duration-200"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "linear-gradient(135deg,#00e5ff,#9d5cff)",
                      boxShadow: "0 0 6px rgba(157,92,255,0.6)",
                    }}
                  />
                  Web Design
                </a>
              </li>
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
