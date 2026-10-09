import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/env";
import { auth } from "./auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const allowed = env.ALLOWED_GITHUB_LOGINS;
  if (allowed.length && !allowed.includes(session.user.githubLogin.toLowerCase())) redirect("/sign-in?denied=1");
  return session;
}
