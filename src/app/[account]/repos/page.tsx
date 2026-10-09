import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { modelRefs, pullRequests, repos } from "@/db/schema";
import { requireAccount } from "@/lib/accounts";

export default async function ReposPage({ params }: { params: Promise<{ account: string }> }) {
  const { account: login } = await params;
  const { account } = await requireAccount(login);
  const base = `/${account.login}`;

  const [rows, prCounts, modelRows] = await Promise.all([
    db
      .select()
      .from(repos)
      .where(eq(repos.accountId, account.id))
      .orderBy(asc(repos.isArchived), sql`${repos.pushedAt} desc nulls last`),
    db
      .select({ repoId: pullRequests.repoId, n: count() })
      .from(pullRequests)
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(and(eq(repos.accountId, account.id), eq(pullRequests.isBot, false)))
      .groupBy(pullRequests.repoId),
    db
      .selectDistinct({ repoId: modelRefs.repoId, modelId: modelRefs.modelId })
      .from(modelRefs)
      .innerJoin(repos, eq(modelRefs.repoId, repos.id))
      .where(and(eq(repos.accountId, account.id), isNotNull(modelRefs.modelId)))
      .orderBy(modelRefs.modelId),
  ]);

  const openPrs = new Map(prCounts.map((r) => [r.repoId, r.n]));
  const models = new Map<number, string[]>();
  for (const m of modelRows) {
    if (m.modelId) models.set(m.repoId, [...(models.get(m.repoId) ?? []), m.modelId]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Repos</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No repos yet. Run a sync from Settings.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repo</TableHead>
              <TableHead>Last push</TableHead>
              <TableHead>Open PRs</TableHead>
              <TableHead>Models</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((repo) => {
              const ids = models.get(repo.id) ?? [];
              return (
                <TableRow key={repo.id}>
                  <TableCell>
                    <a href={repo.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {repo.name}
                    </a>
                    {repo.isPrivate && (
                      <Badge variant="outline" className="ml-2">
                        Private
                      </Badge>
                    )}
                    {repo.isArchived && (
                      <Badge variant="secondary" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{repo.pushedAt?.toLocaleDateString("en-GB") ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    <Link href={`${base}/prs?repo=${encodeURIComponent(repo.name)}`} className="hover:underline">
                      {openPrs.get(repo.id) ?? 0}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {ids.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Link href={`${base}/models`} className="hover:underline">
                        {ids.slice(0, 3).join(", ")}
                        {ids.length > 3 && <span className="text-muted-foreground"> +{ids.length - 3}</span>}
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export const instant = false;
