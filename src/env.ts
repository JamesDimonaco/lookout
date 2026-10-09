import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(16),
  ALLOWED_GITHUB_LOGINS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)),
});

export const env = schema.parse(process.env);

export const publicEnv = {
  githubAppSlug: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "lookout",
};
