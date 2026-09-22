import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100svh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <span className="font-mono text-sm text-cyan-400 tracking-[0.2em] uppercase">
          404
        </span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          The system you&apos;re looking for doesn&apos;t exist at this
          address. Let&apos;s get you back on track.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-8 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 text-navy-950 font-semibold text-sm transition-shadow hover:shadow-[0_0_30px_rgba(0,180,216,0.25)]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
