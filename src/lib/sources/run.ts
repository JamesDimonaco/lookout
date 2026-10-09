import { eq } from "drizzle-orm";
import { db } from "@/db";
import { syncRuns, type GithubAccount } from "@/db/schema";
import type { Source } from "./types";

export async function runSync(source: Source, account: GithubAccount) {
  const [run] = await db
    .insert(syncRuns)
    .values({ accountId: account.id, source: source.id, status: "running" })
    .returning({ id: syncRuns.id });
  try {
    const result = await source.sync(account);
    await db.update(syncRuns).set({ status: "ok", finishedAt: new Date() }).where(eq(syncRuns.id, run.id));
    return result;
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ status: "error", finishedAt: new Date(), error: e instanceof Error ? e.message : String(e) })
      .where(eq(syncRuns.id, run.id));
    throw e;
  }
}
