import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const githubAccounts = pgTable("github_accounts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  login: text().notNull().unique(),
  type: text({ enum: ["User", "Organization"] }).notNull(),
  installationId: bigint({ mode: "number" }).notNull().unique(),
  avatarUrl: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const accountMembers = pgTable(
  "account_members",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: integer()
      .notNull()
      .references(() => githubAccounts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.accountId] })],
);

export const repos = pgTable(
  "repos",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer()
      .notNull()
      .references(() => githubAccounts.id, { onDelete: "cascade" }),
    githubId: bigint({ mode: "number" }).notNull().unique(),
    name: text().notNull(),
    defaultBranch: text().notNull(),
    isPrivate: boolean().notNull(),
    isArchived: boolean().notNull(),
    pushedAt: timestamp({ withTimezone: true }),
    url: text().notNull(),
    lastScannedSha: text(),
    lastScannedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.accountId)],
);

export const ciStates = ["success", "failure", "pending", "none"] as const;
export const reviewDecisions = ["approved", "changes_requested", "review_required", "none"] as const;

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    repoId: integer()
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    number: integer().notNull(),
    title: text().notNull(),
    author: text().notNull(),
    isBot: boolean().notNull(),
    isDraft: boolean().notNull(),
    ciState: text({ enum: ciStates }).notNull(),
    reviewDecision: text({ enum: reviewDecisions }).notNull(),
    url: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex().on(t.repoId, t.number)],
);

export const modelRefKinds = ["literal", "env", "config"] as const;

export const modelRefs = pgTable(
  "model_refs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    repoId: integer()
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    filePath: text().notNull(),
    line: integer().notNull(),
    raw: text().notNull(),
    modelId: text(),
    kind: text({ enum: modelRefKinds }).notNull(),
    scannedSha: text().notNull(),
  },
  (t) => [index().on(t.repoId), index().on(t.modelId)],
);

export const syncSources = ["github", "scanner"] as const;
export const syncStatuses = ["running", "ok", "error"] as const;

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    accountId: integer()
      .notNull()
      .references(() => githubAccounts.id, { onDelete: "cascade" }),
    source: text({ enum: syncSources }).notNull(),
    status: text({ enum: syncStatuses }).notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    error: text(),
  },
  (t) => [index().on(t.accountId, t.source)],
);

export type GithubAccount = typeof githubAccounts.$inferSelect;
export type Repo = typeof repos.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type ModelRef = typeof modelRefs.$inferSelect;
