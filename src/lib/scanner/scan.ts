import { createGunzip } from "node:zlib";
import { Parser, type ReadEntry } from "tar";
import type { ModelRef } from "@/db/schema";
import { findModelRefs } from "./patterns";

export type ScannedRef = Pick<ModelRef, "filePath" | "line" | "raw" | "modelId" | "kind">;

const EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "swift", "json", "yaml", "yml", "toml",
]);
const EXCLUDED_DIRS = new Set(["node_modules", "dist", "build", ".next", "out", "vendor", ".git", "coverage"]);
const EXCLUDED_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock"]);
const MAX_FILE_BYTES = 512 * 1024;

function shouldScan(filePath: string): boolean {
  const segments = filePath.split("/");
  const base = segments.pop() ?? "";
  if (segments.some((s) => EXCLUDED_DIRS.has(s))) return false;
  if (base.startsWith(".env")) return true;
  if (EXCLUDED_FILES.has(base) || base.endsWith(".min.js") || base.endsWith(".map") || base.endsWith(".d.ts")) {
    return false;
  }
  const dot = base.lastIndexOf(".");
  return dot > 0 && EXTENSIONS.has(base.slice(dot + 1));
}

export async function scanTarball(tgz: Buffer | NodeJS.ReadableStream): Promise<ScannedRef[]> {
  const refs: ScannedRef[] = [];
  const seen = new Set<string>();
  const parser = new Parser();

  parser.on("entry", (entry: ReadEntry) => {
    // GitHub tarballs wrap everything in "<owner>-<repo>-<sha>/".
    const filePath = entry.path.slice(entry.path.indexOf("/") + 1);
    if (entry.type !== "File" || entry.size > MAX_FILE_BYTES || !shouldScan(filePath)) {
      entry.resume();
      return;
    }
    const chunks: Buffer[] = [];
    entry.on("data", (chunk: Buffer) => chunks.push(chunk));
    entry.on("end", () => {
      const lines = Buffer.concat(chunks).toString("utf8").split("\n");
      lines.forEach((text, i) => {
        for (const ref of findModelRefs(text)) {
          const key = `${filePath}\0${i + 1}\0${ref.raw}`;
          if (seen.has(key)) continue;
          seen.add(key);
          refs.push({ filePath, line: i + 1, ...ref });
        }
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    parser.on("end", resolve);
    parser.on("error", reject);
    const gunzip = createGunzip();
    gunzip.on("error", reject);
    gunzip.on("data", (chunk: Buffer) => parser.write(chunk));
    gunzip.on("end", () => parser.end());
    if (Buffer.isBuffer(tgz)) gunzip.end(tgz);
    else tgz.pipe(gunzip);
  });

  return refs;
}
