"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/accounts";
import { githubSource } from "@/lib/sources/github";
import { runSync } from "@/lib/sources/run";

export async function syncNow(login: string) {
  const { account } = await requireAccount(login);
  try {
    const { summary } = await runSync(githubSource, account);
    revalidatePath(`/${account.login}`, "layout");
    return { ok: true as const, summary };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
