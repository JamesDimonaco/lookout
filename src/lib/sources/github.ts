import { and, eq, notInArray, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pullRequests, repos } from "@/db/schema";
import { installationOctokit } from "@/lib/github/app";
import type { Source } from "./types";

type PrNode = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  author: { __typename: string; login: string } | null;
  commits: {
    nodes: { commit: { statusCheckRollup: { state: "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" } | null } }[];
  };
};

type PrConnection = { nodes: PrNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
type PrQueryResponse = Record<string, { pullRequests: PrConnection } | null>;
type PrPageResponse = { repository: { pullRequests: PrConnection } | null };

// octokit's GraphqlResponseError carries the resolved aliases alongside the errors.
function isPartialGraphqlError(e: unknown): e is { data: PrQueryResponse; errors: { message: string }[] } {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: string }).name === "GraphqlResponseError" &&
    "data" in e &&
    "errors" in e
  );
}

type PrInsert = typeof pullRequests.$inferInsert;

const CI_STATE: Record<NonNullable<PrNode["commits"]["nodes"][number]["commit"]["statusCheckRollup"]>["state"], PrInsert["ciState"]> = {
  SUCCESS: "success",
  FAILURE: "failure",
  ERROR: "failure",
  PENDING: "pending",
  EXPECTED: "pending",
};

const REVIEW_DECISION: Record<NonNullable<PrNode["reviewDecision"]>, PrInsert["reviewDecision"]> = {
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
  REVIEW_REQUIRED: "review_required",
};

const PR_FRAGMENT = `fragment PR on PullRequest {
  number title url isDraft createdAt updatedAt reviewDecision
  author { __typename login }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

const BATCH_SIZE = 20;
const PR_PAGE_QUERY = `${PR_FRAGMENT}
query ($owner: String!, $name: String!, $after: String!) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 50, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ...PR } pageInfo { hasNextPage endCursor }
    }
  }
}`;

function toRow(repoId: number, pr: PrNode): PrInsert {
  const login = pr.author?.login ?? "ghost";
  const rollup = pr.commits.nodes[0]?.commit.statusCheckRollup;
  return {
    repoId,
    number: pr.number,
    title: pr.title,
    author: login,
    isBot: pr.author?.__typename === "Bot" || login.endsWith("[bot]"),
    isDraft: pr.isDraft,
    ciState: rollup ? CI_STATE[rollup.state] : "none",
    reviewDecision: pr.reviewDecision ? REVIEW_DECISION[pr.reviewDecision] : "none",
    url: pr.url,
    createdAt: new Date(pr.createdAt),
    updatedAt: new Date(pr.updatedAt),
  };
}

export const githubSource: Source = {
  id: "github",
  async sync(account) {
    const octokit = await installationOctokit(account.installationId);
    const ghRepos = await octokit.paginate("GET /installation/repositories", { per_page: 100 });

    const active: { id: number; owner: string; name: string }[] = [];
    for (const r of ghRepos) {
      const [row] = await db
        .insert(repos)
        .values({
          accountId: account.id,
          githubId: r.id,
          name: r.name,
          defaultBranch: r.default_branch,
          isPrivate: r.private,
          isArchived: r.archived,
          pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
          url: r.html_url,
        })
        .onConflictDoUpdate({
          target: repos.githubId,
          set: {
            accountId: account.id,
            name: r.name,
            defaultBranch: r.default_branch,
            isPrivate: r.private,
            isArchived: r.archived,
            pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
            url: r.html_url,
          },
        })
        .returning({ id: repos.id });
      if (!r.archived) active.push({ id: row.id, owner: r.owner.login, name: r.name });
    }

    await db.delete(repos).where(
      and(
        eq(repos.accountId, account.id),
        notInArray(
          repos.githubId,
          ghRepos.map((r) => r.id),
        ),
      ),
    );

    await db.delete(pullRequests).where(
      inArray(
        pullRequests.repoId,
        db
          .select({ id: repos.id })
          .from(repos)
          .where(and(eq(repos.accountId, account.id), eq(repos.isArchived, true))),
      ),
    );

    let prCount = 0;
    let failedRepos = 0;
    for (let i = 0; i < active.length; i += BATCH_SIZE) {
      const batch = active.slice(i, i + BATCH_SIZE);
      const fields = batch
        .map(
          (r, j) =>
            `r${j}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.name)}) { pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...PR } pageInfo { hasNextPage endCursor } } }`,
        )
        .join("\n");
      let data: PrQueryResponse;
      try {
        data = await octokit.graphql<PrQueryResponse>(`${PR_FRAGMENT}\nquery { ${fields} }`);
      } catch (e) {
        if (!isPartialGraphqlError(e) || !e.data) throw e;
        console.error(`graphql errors: ${e.errors.map((x) => x.message).join("; ")}`);
        data = e.data;
      }

      for (const [j, repo] of batch.entries()) {
        const connection = data[`r${j}`]?.pullRequests;
        if (!connection) {
          failedRepos++;
          continue;
        }
        const nodes = [...connection.nodes];
        let page = connection.pageInfo;
        while (page.hasNextPage && page.endCursor) {
          const more = await octokit.graphql<PrPageResponse>(PR_PAGE_QUERY, {
            owner: repo.owner,
            name: repo.name,
            after: page.endCursor,
          });
          const next = more.repository?.pullRequests;
          if (!next) break;
          nodes.push(...next.nodes);
          page = next.pageInfo;
        }
        // A PR updated mid-pagination can appear on two pages.
        const unique = [...new Map(nodes.map((pr) => [pr.number, pr])).values()];
        await db.delete(pullRequests).where(eq(pullRequests.repoId, repo.id));
        if (unique.length) await db.insert(pullRequests).values(unique.map((pr) => toRow(repo.id, pr)));
        prCount += unique.length;
      }
    }

    return {
      summary: `${ghRepos.length} repos, ${prCount} open PRs${failedRepos ? `, ${failedRepos} repos failed` : ""}`,
    };
  },
};
