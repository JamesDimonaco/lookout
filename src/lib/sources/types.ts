import type { GithubAccount } from "@/db/schema";

export type SyncResult = { summary: string };

export type Source = {
  id: "github" | "scanner";
  sync(account: GithubAccount): Promise<SyncResult>;
};
