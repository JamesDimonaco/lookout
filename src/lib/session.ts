import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/env";
import { auth } from "./auth";

// Without this, Cache Components prerenders the page and aborts any fetch made during it.
export const getSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const allowed = env.ALLOWED_GITHUB_LOGINS;
  if (allowed.length && !allowed.includes(session.user.githubLogin.toLowerCase())) redirect("/sign-in?denied=1");
  return session;
}
