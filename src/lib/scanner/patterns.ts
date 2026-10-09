import type { ModelRef } from "@/db/schema";

export type FoundRef = Pick<ModelRef, "raw" | "modelId" | "kind">;

const BOUNDARY = String.raw`(?<![\w-])`;
const END = String.raw`(?![a-z0-9.-])`;
const ANTHROPIC_PREFIX = String.raw`(?:(?:us|eu|apac)\.)?(?:anthropic[./])?`;

const LITERAL = new RegExp(
  [
    String.raw`${ANTHROPIC_PREFIX}claude-(?:\d|opus|sonnet|haiku|fable|mythos)[a-z0-9.-]*?(?:-v\d+:\d+|\[1m\]|@\d+)?${END}`,
    String.raw`(?:openai/)?(?:gpt-\d[a-z0-9.-]*|o[134]-(?:mini|pro|preview)(?:-\d{4}-\d{2}-\d{2})?|o[134]-\d{4}-\d{2}-\d{2}|(?<=["'\x60])o[134](?=["'\x60])|chatgpt-[a-z0-9.-]+|text-embedding-[a-z0-9-]+)${END}`,
    String.raw`(?:google/|models/)?gemini-\d[a-z0-9.-]*${END}`,
    String.raw`llama-?\d[a-z0-9.-]*${END}`,
    String.raw`(?:mistral|mixtral|codestral)-[a-z0-9.-]+${END}`,
    String.raw`deepseek-[a-z0-9.-]+${END}`,
  ]
    .map((p) => `${BOUNDARY}(?:${p})`)
    .join("|"),
  "g",
);

const ENV_JS = /\benv\.([A-Za-z_][A-Za-z0-9_]*)/g;
const ENV_PY = /os\.(?:environ\[|environ\.get\(|getenv\()\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g;
const CONFIG = /\bmodel["']?\s*[:=]\s*["'`]([^"'`\s]+)["'`]/gi;

function literals(text: string): string[] {
  return Array.from(text.matchAll(LITERAL), (m) => m[0].replace(/[-.]+$/, ""));
}

export function normalizeModelId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(?:(?:us|eu|apac)\.)?anthropic[./]/, "")
    .replace(/^(?:openai|google|models)\//, "")
    .replace(/-v\d+:\d+$/, "")
    .replace(/\[1m\]$/, "")
    .replace(/@\d+$/, "")
    .replace(/-\d{8}$/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .replace(/-latest$/, "");
}

export function findModelRefs(line: string): FoundRef[] {
  const found = new Map<string, FoundRef>();
  const add = (ref: FoundRef) => {
    if (!found.has(ref.raw)) found.set(ref.raw, ref);
  };

  for (const raw of literals(line)) add({ raw, modelId: normalizeModelId(raw), kind: "literal" });

  for (const re of [ENV_JS, ENV_PY]) {
    for (const m of line.matchAll(re)) {
      if (/MODEL/i.test(m[1])) add({ raw: m[1], modelId: null, kind: "env" });
    }
  }

  for (const m of line.matchAll(CONFIG)) {
    if (literals(m[1]).length === 0) add({ raw: m[1], modelId: null, kind: "config" });
  }

  return Array.from(found.values());
}
