import { cn } from "cn";

// Decorative. The sweep is a rotating conic gradient; blips sit at fixed bearings.
export function Radar({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-full border border-brand/30", className)} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full text-brand/20">
        <circle cx="50" cy="50" r="16.5" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.4" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.4" />
      </svg>
      <div className="absolute inset-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,color-mix(in_oklab,var(--primary)_45%,transparent)_360deg)] motion-reduce:animate-none motion-reduce:opacity-0" />
      <span className="absolute top-[28%] left-[62%] size-[3%] rounded-full bg-section-prs shadow-[0_0_8px_var(--section-prs)]" />
      <span className="absolute top-[64%] left-[30%] size-[3%] rounded-full bg-section-repos shadow-[0_0_8px_var(--section-repos)]" />
      <span className="absolute top-1/2 left-1/2 size-[4%] -translate-1/2 rounded-full bg-brand" />
    </div>
  );
}
