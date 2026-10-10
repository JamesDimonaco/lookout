"use client";

import Link from "next/link";
import { StatusLight, type Status } from "@/components/status-light";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

export type LastSweep = { at: string; status: "running" | "ok" | "error" } | null;

const light: Record<NonNullable<LastSweep>["status"], Status> = { ok: "ok", error: "warn", running: "pending" };
const word = { ok: "OK", error: "Error", running: "Running" };

export function OpsClock({ sweep, settingsHref }: { sweep: LastSweep; settingsHref: string }) {
  const { setOpenMobile } = useSidebar();
  const summary = sweep ? `Last sweep ${sweep.at}, ${word[sweep.status].toLowerCase()}` : "Never synced. Run one from Settings.";
  return (
    <SidebarMenuButton
      size="lg"
      tooltip={summary}
      render={<Link href={settingsHref} onClick={() => setOpenMobile(false)} />}
      className="border border-sidebar-border bg-black"
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <StatusLight status={sweep ? light[sweep.status] : "none"} pulse={sweep?.status === "running"} />
      </span>
      {sweep ? (
        <span className="grid flex-1 leading-tight">
          <span className="flex items-baseline justify-between text-xs text-muted-foreground">
            Last sweep
            <span className={sweep.status === "error" ? "text-status-warn" : undefined}>{word[sweep.status]}</span>
          </span>
          <span className="truncate font-mono text-xs tabular-nums">{sweep.at}</span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Never synced. Run one from Settings.</span>
      )}
    </SidebarMenuButton>
  );
}
