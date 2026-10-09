import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { modelRefs, repos } from "@/db/schema";
import { installationOctokit } from "@/lib/github/app";
import { scanTarball } from "@/lib/scanner/scan";
import type { Source } from "./types";

// Keeps each insert well under Postgres's 65535 bind-parameter limit.
const INSERT_CHUNK = 1000;

export const scannerSource: Source = {
  id: "scanner",
  async sync(account) {
    const octokit = await installationOctokit(account.installationId);
    const rows = await db
      .select()
      .from(repos)
      .where(and(eq(repos.accountId, account.id), eq(repos.isArchived, false)));

    let scanned = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;

    for (const repo of rows) {
      const target = { owner: account.login, repo: repo.name };
      try {
        const { data: head } = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
          ...target,
          ref: repo.defaultBranch,
        });
        if (head.sha === repo.lastScannedSha) {
          skipped++;
          continue;
        }

        const { data: body } = await octokit.request("GET /repos/{owner}/{repo}/tarball/{ref}", {
          ...target,
          ref: head.sha,
          request: { parseSuccessResponseBody: false },
        });
        if (!(body instanceof ReadableStream)) throw new Error("tarball response was not a stream");
        const refs = await scanTarball(Readable.fromWeb(body as WebReadableStream<Uint8Array>));

        await db.delete(modelRefs).where(eq(modelRefs.repoId, repo.id));
        for (let i = 0; i < refs.length; i += INSERT_CHUNK) {
          await db
            .insert(modelRefs)
            .values(refs.slice(i, i + INSERT_CHUNK).map((r) => ({ ...r, repoId: repo.id, scannedSha: head.sha })));
        }
        await db
          .update(repos)
          .set({ lastScannedSha: head.sha, lastScannedAt: new Date() })
          .where(eq(repos.id, repo.id));

        scanned++;
        total += refs.length;
      } catch (e) {
        failed++;
        console.error(`scan failed for ${target.owner}/${target.repo}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (failed > 0 && scanned + skipped === 0) throw new Error(`all ${failed} repos failed to scan`);
    return { summary: `${scanned} scanned, ${skipped} unchanged, ${failed} failed, ${total} refs` };
  },
};
