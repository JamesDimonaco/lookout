import { and, count, countDistinct, desc, eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { cn } from "cn";
import { Radar } from "@/components/radar";
import { StatusLight } from "@/components/status-light";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { modelRefs, pullRequests, repos } from "@/db/schema";
import { requireAccount } from "@/lib/accounts";
import { flaggedModelIds } from "@/lib/models/registry";

export default async function OverviewPage({ params }: { params: Promise<{ account: string }> }) {
  const { account: login } = await params;
  const { account } = await requireAccount(login);
  const base = `/${account.login}`;

  const [[repoCount], [prCount], [failingCount]] = await Promise.all([
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
      .where(
        and(eq(repos.accountId, account.id), eq(pullRequests.isBot, false), eq(pullRequests.ciState, "failure")),
      ),
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
    { label: "Repos", value: repoCount.n, href: `${base}/repos`, tick: "bg-section-repos" },
    { label: "Open PRs", value: prCount.n, href: `${base}/prs`, tick: "bg-section-prs" },
    { label: "Failing CI", value: failingCount.n, href: `${base}/prs?ci=failure`, tick: "bg-status-fail" },
    { label: "Repos with flagged models", value: flaggedRepos.n, href: `${base}/models`, tick: "bg-section-models" },
  ];

  return (
    <div className="space-y-8 pt-2 md:pt-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight break-all md:text-4xl">{account.login}</h1>

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card md:grid-cols-4">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className={cn(
              "group relative flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t md:border-t-0",
              i === 2 && "md:border-l",
            )}
          >
            <span className={cn("absolute top-0 left-4 h-0.5 w-6", s.tick)} />
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="font-display text-4xl font-semibold tabular-nums group-hover:text-brand">{s.value}</span>
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-brand/40">
        <h2 className="bg-brand px-4 py-2 font-display text-lg font-semibold text-black">Needs you</h2>
        {needsYou.length === 0 ? (
          <div className="flex items-center gap-4 p-4">
            <Radar className="size-16 shrink-0" />
            <p className="text-muted-foreground">Nothing failing or sent back.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {needsYou.map((pr) => (
              <li key={pr.id}>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted md:flex-row md:items-center md:gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <StatusLight status={pr.ciState === "failure" ? "fail" : "warn"} pulse={pr.ciState === "failure"} />
                    <span className="shrink-0 text-sm text-muted-foreground">{pr.repo}</span>
                    <span className="truncate">
                      <span className="font-mono text-sm text-muted-foreground">#{pr.number}</span> {pr.title}
                    </span>
                  </span>
                  <span className="flex gap-1.5 pl-4.5 md:ml-auto md:pl-0">
                    {pr.ciState === "failure" && <Badge variant="fail">CI failing</Badge>}
                    {pr.reviewDecision === "changes_requested" && <Badge variant="warn">Changes requested</Badge>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const instant = false;
