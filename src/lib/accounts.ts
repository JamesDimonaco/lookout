import "server-only";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Octokit, RequestError } from "octokit";
import { db } from "@/db";
import { account, accountMembers, githubAccounts } from "@/db/schema";
import { requireSession } from "./session";

// Access model: a user sees an account only if GitHub lists that account's installation for them.
export async function syncUserInstallations(userId: string) {
  const [gh] = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")));
  if (!gh?.accessToken) throw new Error("No GitHub access token for user");
  const octokit = new Octokit({ auth: gh.accessToken });
  let installations: Awaited<ReturnType<typeof listInstallations>>;
  try {
    installations = await listInstallations(octokit);
  } catch (e) {
    // User-to-server tokens can expire; a fresh sign-in replaces the stored token.
    if (e instanceof RequestError && e.status === 401) return "reauth" as const;
    throw e;
  }

  const ids: number[] = [];
  for (const inst of installations) {
    const acct = inst.account;
    if (!acct || !("login" in acct)) continue;
    const [row] = await db
      .insert(githubAccounts)
      .values({
        login: acct.login,
        type: acct.type === "Organization" ? "Organization" : "User",
        installationId: inst.id,
        avatarUrl: acct.avatar_url,
      })
      .onConflictDoUpdate({
        target: githubAccounts.login,
        set: { installationId: inst.id, avatarUrl: acct.avatar_url },
      })
      .returning({ id: githubAccounts.id });
    ids.push(row.id);
  }

  if (ids.length) {
    await db
      .insert(accountMembers)
      .values(ids.map((accountId) => ({ userId, accountId })))
      .onConflictDoNothing();
    await db
      .delete(accountMembers)
      .where(and(eq(accountMembers.userId, userId), notInArray(accountMembers.accountId, ids)));
  } else {
    await db.delete(accountMembers).where(eq(accountMembers.userId, userId));
  }
  return "ok" as const;
}

function listInstallations(octokit: Octokit) {
  return octokit.paginate("GET /user/installations", { per_page: 100 });
}

export async function getUserAccounts(userId: string) {
  return db
    .select({
      id: githubAccounts.id,
      login: githubAccounts.login,
      type: githubAccounts.type,
      avatarUrl: githubAccounts.avatarUrl,
    })
    .from(githubAccounts)
    .innerJoin(accountMembers, eq(accountMembers.accountId, githubAccounts.id))
    .where(eq(accountMembers.userId, userId))
    .orderBy(githubAccounts.login);
}

export async function requireAccount(login: string) {
  const session = await requireSession();
  const [row] = await db
    .select({ account: githubAccounts })
    .from(githubAccounts)
    .innerJoin(accountMembers, eq(accountMembers.accountId, githubAccounts.id))
    .where(
      and(
        eq(accountMembers.userId, session.user.id),
        sql`lower(${githubAccounts.login}) = ${login.toLowerCase()}`,
      ),
    );
  if (!row) notFound();
  return { account: row.account, session };
}
