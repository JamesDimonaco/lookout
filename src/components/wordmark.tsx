import { RadioTower } from "lucide-react";
import { cn } from "cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-semibold tracking-tight", className)}>
      <RadioTower className="size-[1.1em] shrink-0 text-brand" aria-hidden />
      <span>lookout</span>
    </span>
  );
}
