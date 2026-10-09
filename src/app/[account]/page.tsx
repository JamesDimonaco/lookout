import { and, count, countDistinct, desc, eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { modelRefs, pullRequests, repos, syncRuns } from "@/db/schema";
import { requireAccount } from "@/lib/accounts";
import { flaggedModelIds } from "@/lib/models/registry";

export default async function OverviewPage({ params }: { params: Promise<{ account: string }> }) {
  const { account: login } = await params;
  const { account } = await requireAccount(login);
  const base = `/${account.login}`;

  const [[repoCount], [prCount], [failingCount], [lastSync]] = await Promise.all([
    db
      .select({ n: count() })
      .from(repos)
      .where(and(eq(repos.accountId, account.id), eq(repos.isArchived, false))),
    db
      .select({ n: count() })
      .from(pullRequests)
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(and(eq(repos.accountId, account.id), eq(pullRequests.isBot, false))),
    db
      .select({ n: count() })
      .from(pullRequests)
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(and(eq(repos.accountId, account.id), eq(pullRequests.ciState, "failure"))),
    db
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.accountId, account.id))
      .orderBy(desc(syncRuns.startedAt))
      .limit(1),
  ]);

  const flagged = flaggedModelIds();
  const [flaggedRepos] = flagged.length
    ? await db
        .select({ n: countDistinct(modelRefs.repoId) })
        .from(modelRefs)
        .innerJoin(repos, eq(modelRefs.repoId, repos.id))
        .where(and(eq(repos.accountId, account.id), inArray(modelRefs.modelId, flagged)))
    : [{ n: 0 }];

  const needsYou = await db
    .select({
      id: pullRequests.id,
      repo: repos.name,
      number: pullRequests.number,
      title: pullRequests.title,
      url: pullRequests.url,
      ciState: pullRequests.ciState,
      reviewDecision: pullRequests.reviewDecision,
    })
    .from(pullRequests)
    .innerJoin(repos, eq(pullRequests.repoId, repos.id))
    .where(
      and(
        eq(repos.accountId, account.id),
        eq(pullRequests.isBot, false),
        or(eq(pullRequests.ciState, "failure"), eq(pullRequests.reviewDecision, "changes_requested")),
      ),
    )
    .orderBy(desc(pullRequests.updatedAt))
    .limit(10);

  const stats = [
    { label: "Repos", value: repoCount.n, href: `${base}/repos` },
    { label: "Open PRs", value: prCount.n, href: `${base}/prs` },
    { label: "Failing CI", value: failingCount.n, href: `${base}/prs?ci=failure` },
    { label: "Repos with flagged models", value: flaggedRepos.n, href: `${base}/models` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{account.login}</h1>
        <p className="text-sm text-muted-foreground">
          {lastSync
            ? `Last sync ${lastSync.startedAt.toLocaleString("en-GB")} (${lastSync.status})`
            : "Never synced. Run one from Settings."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Needs you</h2>
        {needsYou.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing failing or sent back. Nice.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {needsYou.map((pr) => (
              <li key={pr.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{pr.repo}</span>
                <a href={pr.url} className="truncate hover:underline" target="_blank" rel="noreferrer">
                  #{pr.number} {pr.title}
                </a>
                <span className="ml-auto flex gap-1">
                  {pr.ciState === "failure" && <Badge variant="destructive">CI failing</Badge>}
                  {pr.reviewDecision === "changes_requested" && <Badge variant="secondary">Changes requested</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
