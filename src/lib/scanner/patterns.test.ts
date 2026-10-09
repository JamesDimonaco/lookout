import { describe, expect, it } from "vitest";
import { findModelRefs, normalizeModelId } from "./patterns";

describe("normalizeModelId", () => {
  it.each([
    ["claude-opus-4-5-20251101", "claude-opus-4-5"],
    ["claude-3-5-sonnet-20241022", "claude-3-5-sonnet"],
    ["anthropic.claude-3-5-sonnet-20241022-v2:0", "claude-3-5-sonnet"],
    ["us.anthropic.claude-opus-4-1-20250805-v1:0", "claude-opus-4-1"],
    ["claude-sonnet-4-5@20250929", "claude-sonnet-4-5"],
    ["claude-opus-5[1m]", "claude-opus-5"],
    ["claude-opus-5", "claude-opus-5"],
    ["gpt-4o-2024-08-06", "gpt-4o"],
    ["gpt-4.1-mini", "gpt-4.1-mini"],
    ["models/gemini-2.5-flash", "gemini-2.5-flash"],
    ["claude-3-5-sonnet-latest", "claude-3-5-sonnet"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeModelId(raw)).toBe(expected);
  });
});

describe("findModelRefs", () => {
  it.each([
    'import { query } from "claude-code";',
    "const cfg = loadClaudeConfig(); // claude-config",
    'import Anthropic from "@anthropic-ai/sdk";',
    'import { Agent } from "claude-agent-sdk";',
    'const gpt = require("gpt-wrapper");',
    "use sonnet for drafts and opus for review",
  ])("ignores %s", (line) => {
    expect(findModelRefs(line)).toEqual([]);
  });

  it("finds literals with provider prefixes and vendor suffixes", () => {
    expect(findModelRefs('modelId: "us.anthropic.claude-opus-4-1-20250805-v1:0",')).toEqual([
      { raw: "us.anthropic.claude-opus-4-1-20250805-v1:0", modelId: "claude-opus-4-1", kind: "literal" },
    ]);
    expect(findModelRefs("model = 'claude-sonnet-4-5@20250929'")).toEqual([
      { raw: "claude-sonnet-4-5@20250929", modelId: "claude-sonnet-4-5", kind: "literal" },
    ]);
    expect(findModelRefs('const m = "claude-opus-5[1m]";')).toEqual([
      { raw: "claude-opus-5[1m]", modelId: "claude-opus-5", kind: "literal" },
    ]);
    expect(findModelRefs('model: "o3-mini-2025-01-31"')).toEqual([
      { raw: "o3-mini-2025-01-31", modelId: "o3-mini", kind: "literal" },
    ]);
  });

  it("returns both models from one line", () => {
    expect(findModelRefs('const model = fast ? "claude-haiku-4-5" : "gpt-4o";')).toEqual([
      { raw: "claude-haiku-4-5", modelId: "claude-haiku-4-5", kind: "literal" },
      { raw: "gpt-4o", modelId: "gpt-4o", kind: "literal" },
    ]);
  });

  it.each([
    ["const model = process.env.ANTHROPIC_MODEL;", "ANTHROPIC_MODEL"],
    ["model: env.OPENAI_MODEL,", "OPENAI_MODEL"],
    ['model = os.environ["MODEL_NAME"]', "MODEL_NAME"],
    ['model = os.environ.get("LLM_MODEL", "x")', "LLM_MODEL"],
    ["model = os.getenv('CLAUDE_MODEL')", "CLAUDE_MODEL"],
  ])("env: %s", (line, name) => {
    expect(findModelRefs(line)).toEqual([{ raw: name, modelId: null, kind: "env" }]);
  });

  it("ignores env vars that are not about models", () => {
    expect(findModelRefs("const url = process.env.DATABASE_URL;")).toEqual([]);
  });

  it("reports config aliases but not config values that are literals", () => {
    expect(findModelRefs('model: "opus",')).toEqual([{ raw: "opus", modelId: null, kind: "config" }]);
    expect(findModelRefs('"model": "sonnet"')).toEqual([{ raw: "sonnet", modelId: null, kind: "config" }]);
    expect(findModelRefs('model: "claude-sonnet-4-5",')).toEqual([
      { raw: "claude-sonnet-4-5", modelId: "claude-sonnet-4-5", kind: "literal" },
    ]);
  });
});
