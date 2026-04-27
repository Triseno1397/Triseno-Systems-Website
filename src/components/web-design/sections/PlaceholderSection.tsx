"use client";

export default function PlaceholderSection({
  number,
  label,
  dataSection,
}: {
  number: string;
  label: string;
  dataSection: string;
}) {
  return (
    <section
      data-section={dataSection}
      className="relative w-full min-h-[100vh] flex items-center justify-center"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.08]" />
      <div className="text-center px-6 select-none">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-3">
          Section {number}
        </div>
        <div className="text-sm text-white/40 max-w-md mx-auto">{label}</div>
      </div>
    </section>
  );
}
