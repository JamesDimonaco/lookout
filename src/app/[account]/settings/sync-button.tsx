"use client";

import { cn } from "cn";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncNow } from "./actions";

export function SyncButton({ login }: { login: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof syncNow>> | null>(null);
  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await syncNow(login)))}
      >
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      {result && (
        <p className={cn("text-sm", result.ok ? "text-muted-foreground" : "text-destructive")}>
          {result.ok ? result.summary : result.error}
        </p>
      )}
    </div>
  );
}
