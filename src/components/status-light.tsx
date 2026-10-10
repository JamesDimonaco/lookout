import { cn } from "cn";

const colours = {
  fail: "bg-status-fail",
  warn: "bg-status-warn",
  ok: "bg-status-ok",
  pending: "bg-status-pending",
  none: "bg-status-none",
} as const;

export type Status = keyof typeof colours;

export function StatusLight({ status, pulse = false, className }: { status: Status; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden>
      {pulse && (
        <span className={cn("absolute inset-0 rounded-full opacity-75 animate-ping motion-reduce:hidden", colours[status])} />
      )}
      <span className={cn("relative size-2 rounded-full", colours[status])} />
    </span>
  );
}
