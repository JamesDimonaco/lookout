import { Button } from "@/components/ui/button";
import { env } from "@/env";

export default async function GithubAppSetupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const base = env.BETTER_AUTH_URL;
  const manifest = JSON.stringify({
    name: "lookout",
    url: base,
    description: "Every repo, every open PR, every AI model in use.",
    redirect_url: `${base}/setup/github-app`,
    callback_urls: [`${base}/api/auth/callback/github`, "http://localhost:3000/api/auth/callback/github"],
    setup_url: `${base}/`,
    public: true,
    request_oauth_on_install: true,
    hook_attributes: { url: `${base}/api/github/webhook`, active: false },
    default_events: [],
    default_permissions: {
      contents: "read",
      metadata: "read",
      pull_requests: "read",
      checks: "read",
      statuses: "read",
      emails: "read",
    },
  });

  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">Create the lookout GitHub App</h1>
      {code ? (
        <>
          <p>GitHub created the App. This one-time code is valid for an hour:</p>
          <pre className="rounded-md border bg-muted p-3 text-sm select-all">{code}</pre>
          <p className="text-muted-foreground text-sm">
            Exchange it with <code>gh api -X POST /app-manifests/{code}/conversions</code>.
          </p>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">
            This sends a pre-filled manifest to GitHub: read access to contents, pull requests, checks and
            statuses, OAuth on install, no webhook. Check the name, then press Create on GitHub.
          </p>
          <form method="post" action="https://github.com/settings/apps/new?state=lookout">
            <input type="hidden" name="manifest" value={manifest} />
            <Button type="submit">Create the GitHub App</Button>
          </form>
        </>
      )}
    </main>
  );
}

export const instant = false;
