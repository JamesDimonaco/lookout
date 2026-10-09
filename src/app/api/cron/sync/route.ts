import { db } from "@/db";
import { githubAccounts } from "@/db/schema";
import { env } from "@/env";
import { githubSource } from "@/lib/sources/github";
import { runSync } from "@/lib/sources/run";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const accounts = await db.select().from(githubAccounts);
  const results: { login: string; summary?: string; error?: string }[] = [];
  for (const account of accounts) {
    try {
      const { summary } = await runSync(githubSource, account);
      results.push({ login: account.login, summary });
    } catch (e) {
      results.push({ login: account.login, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return Response.json(results);
}
