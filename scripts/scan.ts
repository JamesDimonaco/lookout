import { db } from "@/db";
import { githubAccounts } from "@/db/schema";
import { runSync } from "@/lib/sources/run";
import { scannerSource } from "@/lib/sources/scanner";

async function main() {
  const accounts = await db.select().from(githubAccounts);
  for (const account of accounts) {
    try {
      const { summary } = await runSync(scannerSource, account);
      console.log(`${account.login}: ${summary}`);
    } catch (e) {
      process.exitCode = 1;
      console.error(`${account.login}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main().catch((e: unknown) => {
  process.exitCode = 1;
  console.error(e);
});
