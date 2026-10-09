import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { syncRuns } from "@/db/schema";
import { publicEnv } from "@/env";
import { requireAccount } from "@/lib/accounts";
import { SyncButton } from "./sync-button";

export default async function SettingsPage({ params }: { params: Promise<{ account: string }> }) {
  const { account: login } = await params;
  const { account } = await requireAccount(login);

  const runs = await db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.accountId, account.id))
    .orderBy(desc(syncRuns.startedAt))
    .limit(10);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {account.login} ({account.type === "Organization" ? "org" : "user"})
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Sync</h2>
        <SyncButton login={account.login} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Recent syncs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No syncs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.source}</TableCell>
                  <TableCell>
                    <Badge variant={run.status === "error" ? "destructive" : run.status === "ok" ? "outline" : "secondary"}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{run.startedAt.toLocaleString("en-GB")}</TableCell>
                  <TableCell className="tabular-nums">{run.finishedAt?.toLocaleString("en-GB") ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground" title={run.error ?? undefined}>
                    {run.error ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">GitHub App</h2>
        <a
          href={`https://github.com/apps/${publicEnv.githubAppSlug}/installations/new`}
          className="text-sm underline underline-offset-4"
        >
          Install on another account
        </a>
      </section>
    </div>
  );
}
