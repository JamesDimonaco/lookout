import { and, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { modelRefs, repos } from "@/db/schema";
import { requireAccount } from "@/lib/accounts";
import { FLAGGED_STATUSES, lookupModel, providerOf, type ModelEntry } from "@/lib/models/registry";

const REFS_SHOWN = 20;

type Ref = {
  repo: string;
  filePath: string;
  line: number;
  raw: string;
  modelId: string | null;
  kind: (typeof modelRefs.$inferSelect)["kind"];
  scannedSha: string;
};

type Group = { key: string; entry?: ModelEntry; refs: Ref[]; repoCount: number };

function groupBy(refs: Ref[], keyOf: (r: Ref) => string): Group[] {
  const groups = new Map<string, Ref[]>();
  for (const ref of refs) {
    const key = keyOf(ref);
    groups.set(key, [...(groups.get(key) ?? []), ref]);
  }
  return Array.from(groups, ([key, items]) => ({
    key,
    entry: lookupModel(key),
    refs: items,
    repoCount: new Set(items.map((r) => r.repo)).size,
  })).sort((a, b) => b.repoCount - a.repoCount || b.refs.length - a.refs.length || a.key.localeCompare(b.key));
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default async function ModelsPage({ params }: { params: Promise<{ account: string }> }) {
  const { account: login } = await params;
  const { account } = await requireAccount(login);

  const [repoRows, refs] = await Promise.all([
    db
      .select({ lastScannedAt: repos.lastScannedAt })
      .from(repos)
      .where(and(eq(repos.accountId, account.id), eq(repos.isArchived, false))),
    db
      .select({
        repo: repos.name,
        filePath: modelRefs.filePath,
        line: modelRefs.line,
        raw: modelRefs.raw,
        modelId: modelRefs.modelId,
        kind: modelRefs.kind,
        scannedSha: modelRefs.scannedSha,
      })
      .from(modelRefs)
      .innerJoin(repos, eq(modelRefs.repoId, repos.id))
      .where(eq(repos.accountId, account.id))
      .orderBy(repos.name, modelRefs.filePath, modelRefs.line),
  ]);

  const scannedAt = repoRows.flatMap((r) => (r.lastScannedAt ? [r.lastScannedAt.getTime()] : []));
  const latest = scannedAt.length ? new Date(Math.max(...scannedAt)) : null;

  const literal = groupBy(
    refs.filter((r) => r.kind === "literal"),
    (r) => r.modelId ?? r.raw,
  );
  const sections = [
    { title: "Flagged", groups: literal.filter((g) => g.entry && FLAGGED_STATUSES.includes(g.entry.status)) },
    { title: "Current", groups: literal.filter((g) => g.entry?.status === "current") },
    { title: "Unknown", groups: literal.filter((g) => !g.entry) },
    { title: "Dynamic", groups: groupBy(refs.filter((r) => r.kind !== "literal"), (r) => r.raw) },
  ].filter((s) => s.groups.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {scannedAt.length} of {plural(repoRows.length, "repo")} scanned
          {latest && ` · last scan ${latest.toLocaleString("en-GB")}`}
        </p>
      </div>

      {scannedAt.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing scanned yet. The nightly scan runs from GitHub Actions; see README.
        </p>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No model references found.</p>
      ) : (
        sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="font-medium">{section.title}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {section.groups.map((group) => (
                <ModelCard key={group.key} group={group} login={account.login} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function statusVariant(status: ModelEntry["status"] | undefined) {
  if (!status) return "secondary";
  return status === "current" ? "outline" : "destructive";
}

function ModelCard({ group, login }: { group: Group; login: string }) {
  const { key, entry, refs } = group;
  const dynamic = refs[0].kind !== "literal";
  const shown = refs.slice(0, REFS_SHOWN);
  const byRepo = new Map<string, Ref[]>();
  for (const ref of shown) byRepo.set(ref.repo, [...(byRepo.get(ref.repo) ?? []), ref]);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-mono">
          {key}
          {dynamic ? (
            <Badge variant="secondary">{refs[0].kind}</Badge>
          ) : (
            <>
              <span className="font-sans text-muted-foreground">{entry?.provider ?? providerOf(key)}</span>
              <Badge variant={statusVariant(entry?.status)}>{entry?.status ?? "unknown"}</Badge>
            </>
          )}
        </CardTitle>
        <p className="text-muted-foreground tabular-nums">
          {entry?.successor && <span className="mr-2 text-foreground">use {entry.successor}</span>}
          {entry?.note && <span className="mr-2">{entry.note}</span>}
          {plural(group.repoCount, "repo")} · {plural(refs.length, "ref")}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from(byRepo, ([repo, items]) => (
          <div key={repo}>
            <p className="font-medium">{repo}</p>
            <ul>
              {items.map((ref) => (
                <li key={`${ref.filePath}:${ref.line}:${ref.raw}`} className="flex gap-2 font-mono text-xs">
                  <a
                    href={`https://github.com/${login}/${repo}/blob/${ref.scannedSha}/${ref.filePath}#L${ref.line}`}
                    className="truncate hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ref.filePath}:{ref.line}
                  </a>
                  <span className="truncate text-muted-foreground">{ref.raw}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {refs.length > REFS_SHOWN && <p className="text-xs text-muted-foreground">+{refs.length - REFS_SHOWN} more</p>}
      </CardContent>
    </Card>
  );
}

export const instant = false;
