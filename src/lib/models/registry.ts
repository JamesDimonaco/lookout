export type ModelStatus = "current" | "superseded" | "deprecated" | "retired";
export type Provider = "anthropic" | "openai" | "google" | "meta" | "mistral" | "deepseek" | "other";

export type ModelEntry = {
  id: string;
  provider: Provider;
  status: ModelStatus;
  successor?: string;
  note?: string;
};

// Hand-kept. Anthropic entries checked against the Claude docs model table on 2026-10-09.
// Other providers show as "unknown" until added here.
export const MODELS: ModelEntry[] = [
  { id: "claude-fable-5-1", provider: "anthropic", status: "current" },
  { id: "claude-fable-5", provider: "anthropic", status: "superseded", successor: "claude-fable-5-1" },
  { id: "claude-opus-5-5", provider: "anthropic", status: "current", note: "Launching; cheaper than Opus 5" },
  { id: "claude-opus-5", provider: "anthropic", status: "superseded", successor: "claude-opus-5-5" },
  { id: "claude-opus-4-8", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-opus-4-7", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-opus-4-6", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-opus-4-5", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-opus-4-1", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-opus-4", provider: "anthropic", status: "superseded", successor: "claude-opus-5" },
  { id: "claude-sonnet-5", provider: "anthropic", status: "current" },
  { id: "claude-sonnet-4-6", provider: "anthropic", status: "superseded", successor: "claude-sonnet-5" },
  { id: "claude-sonnet-4-5", provider: "anthropic", status: "superseded", successor: "claude-sonnet-5" },
  { id: "claude-sonnet-4", provider: "anthropic", status: "superseded", successor: "claude-sonnet-5" },
  { id: "claude-haiku-4-5", provider: "anthropic", status: "current" },
  { id: "claude-3-7-sonnet", provider: "anthropic", status: "deprecated", successor: "claude-sonnet-5" },
  { id: "claude-3-5-sonnet", provider: "anthropic", status: "retired", successor: "claude-sonnet-5" },
  { id: "claude-3-5-haiku", provider: "anthropic", status: "deprecated", successor: "claude-haiku-4-5" },
  { id: "claude-3-opus", provider: "anthropic", status: "retired", successor: "claude-opus-5" },
  { id: "claude-3-haiku", provider: "anthropic", status: "deprecated", successor: "claude-haiku-4-5" },
];

const byId = new Map(MODELS.map((m) => [m.id, m]));

export function lookupModel(id: string): ModelEntry | undefined {
  return byId.get(id);
}

export function providerOf(id: string): Provider {
  if (id.startsWith("claude")) return "anthropic";
  if (/^(gpt|o[1-9]|chatgpt|text-embedding|dall-e|whisper)/.test(id)) return "openai";
  if (id.startsWith("gemini") || id.startsWith("gemma")) return "google";
  if (id.startsWith("llama")) return "meta";
  if (id.startsWith("mistral") || id.startsWith("mixtral") || id.startsWith("codestral")) return "mistral";
  if (id.startsWith("deepseek")) return "deepseek";
  return "other";
}

export const FLAGGED_STATUSES: ModelStatus[] = ["superseded", "deprecated", "retired"];

export function flaggedModelIds(): string[] {
  return MODELS.filter((m) => FLAGGED_STATUSES.includes(m.status)).map((m) => m.id);
}
