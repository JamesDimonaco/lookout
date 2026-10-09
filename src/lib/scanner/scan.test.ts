import { Header, Pack, ReadEntry } from "tar";
import { expect, it } from "vitest";
import { scanTarball } from "./scan";

function tarball(files: Record<string, string>): Promise<Buffer> {
  const pack = new Pack({ gzip: true, portable: true });
  for (const [path, content] of Object.entries(files)) {
    const body = Buffer.from(content);
    const entry = new ReadEntry(new Header({ path, type: "File", size: body.length, mtime: new Date(0) }));
    pack.add(entry);
    entry.end(body);
  }
  pack.end();
  return pack.concat();
}

it("scans only source files, strips the root dir and keeps line numbers", async () => {
  const tgz = await tarball({
    "owner-repo-abc123/src/a.ts": 'import x from "y";\n\nconst model = "claude-sonnet-4-5";\n',
    "owner-repo-abc123/README.md": "Uses claude-opus-5 for everything.\n",
    "owner-repo-abc123/node_modules/x/index.js": 'module.exports = "gpt-4o";\n',
    "owner-repo-abc123/.env.example": "DATABASE_URL=\nMODEL=claude-sonnet-5\n",
  });

  expect(await scanTarball(tgz)).toEqual([
    { filePath: "src/a.ts", line: 3, raw: "claude-sonnet-4-5", modelId: "claude-sonnet-4-5", kind: "literal" },
    { filePath: ".env.example", line: 2, raw: "claude-sonnet-5", modelId: "claude-sonnet-5", kind: "literal" },
  ]);
});
