import type { ReactNode } from "react";
import { Fraunces } from "next/font/google";

// The Launch Vault's own display voice (the rest of the site never loads it).
const fraunces = Fraunces({
  variable: "--font-vault",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function LaunchLayout({ children }: { children: ReactNode }) {
  return <div className={`${fraunces.variable} vault-root`}>{children}</div>;
}
