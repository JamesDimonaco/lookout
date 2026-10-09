import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { pullRequests, repos } from "@/db/schema";
import { requireAccount } from "@/lib/accounts";
import { relativeAge } from "@/lib/format";

const STALE_DAYS = 14;

export default async function PrsPage({
  params,
  searchParams,
}: {
  params: Promise<{ account: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ account: login }, sp] = await Promise.all([params, searchParams]);
  const { account, session } = await requireAccount(login);
  const base = `/${account.login}/prs`;

  const filters = {
    ci: sp.ci === "failure",
    mine: sp.mine === "1",
    bots: sp.bots === "1",
    stale: sp.stale === "1",
    repo: typeof sp.repo === "string" ? sp.repo : undefined,
  };

  const conditions = [eq(repos.accountId, account.id)];
  if (!filters.bots) conditions.push(eq(pullRequests.isBot, false));
  if (filters.ci) conditions.push(eq(pullRequests.ciState, "failure"));
  if (filters.mine) {
    conditions.push(sql`lower(${pullRequests.author}) = ${session.user.githubLogin.toLowerCase()}`);
  }
  if (filters.stale) conditions.push(sql`${pullRequests.updatedAt} < now() - make_interval(days => ${STALE_DAYS})`);
  if (filters.repo) conditions.push(eq(repos.name, filters.repo));

  const prs = await db
    .select({
      id: pullRequests.id,
      repo: repos.name,
      number: pullRequests.number,
      title: pullRequests.title,
      url: pullRequests.url,
      author: pullRequests.author,
      isDraft: pullRequests.isDraft,
      ciState: pullRequests.ciState,
      reviewDecision: pullRequests.reviewDecision,
      createdAt: pullRequests.createdAt,
    })
    .from(pullRequests)
    .innerJoin(repos, eq(pullRequests.repoId, repos.id))
    .where(and(...conditions))
    .orderBy(desc(pullRequests.updatedAt));

  const toggle = (key: string, value: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    if (q.get(key) === value) q.delete(key);
    else q.set(key, value);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const filterLinks = [
    { label: "Failing CI", href: toggle("ci", "failure"), active: filters.ci },
    { label: "Mine", href: toggle("mine", "1"), active: filters.mine },
    { label: `Stale (${STALE_DAYS}d+)`, href: toggle("stale", "1"), active: filters.stale },
    { label: "Include bots", href: toggle("bots", "1"), active: filters.bots },
    ...(filters.repo ? [{ label: `Repo: ${filters.repo} ×`, href: toggle("repo", filters.repo), active: true }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {filterLinks.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted",
              f.active ? "bg-muted font-medium" : "text-muted-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto tabular-nums text-muted-foreground">{prs.length} open PRs</span>
      </div>

      {prs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open PRs match.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repo</TableHead>
              <TableHead>PR</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>CI</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prs.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell className="text-muted-foreground">{pr.repo}</TableCell>
                <TableCell className="max-w-md">
                  <a href={pr.url} target="_blank" rel="noreferrer" className="hover:underline">
                    <span className="text-muted-foreground">#{pr.number}</span> {pr.title}
                  </a>
                  {pr.isDraft && (
                    <Badge variant="outline" className="ml-2">
                      Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{pr.author}</TableCell>
                <TableCell className="tabular-nums">{relativeAge(pr.createdAt)}</TableCell>
                <TableCell>
                  {pr.ciState === "failure" && <Badge variant="destructive">failing</Badge>}
                  {pr.ciState === "pending" && <Badge variant="secondary">pending</Badge>}
                  {pr.ciState === "success" && <Badge variant="outline">passing</Badge>}
                  {pr.ciState === "none" && <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {pr.reviewDecision === "approved" && <Badge variant="outline">approved</Badge>}
                  {pr.reviewDecision === "changes_requested" && <Badge variant="secondary">changes requested</Badge>}
                  {pr.reviewDecision === "review_required" && (
                    <span className="text-muted-foreground">review required</span>
                  )}
                  {pr.reviewDecision === "none" && <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export const instant = false;
