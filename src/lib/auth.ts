import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  user: {
    additionalFields: {
      githubLogin: { type: "string", required: true, input: false },
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          const login = (u as { githubLogin?: string }).githubLogin?.toLowerCase();
          if (env.ALLOWED_GITHUB_LOGINS.length && (!login || !env.ALLOWED_GITHUB_LOGINS.includes(login))) {
            throw new APIError("FORBIDDEN", { message: "This GitHub account is not on the allowlist." });
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
