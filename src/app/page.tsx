import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/env";
import { getUserAccounts, syncUserInstallations } from "@/lib/accounts";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const synced = await syncUserInstallations(session.user.id);
  if (synced === "reauth") redirect("/sign-in?reauth=1");
  const accounts = await getUserAccounts(session.user.id);
  if (accounts.length) redirect(`/${accounts[0].login}`);
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-semibold">No accounts yet</h1>
      <p className="text-muted-foreground">
        Install the GitHub App on your user account or an organisation you admin, then come back here.
      </p>
      <Button render={<a href={`https://github.com/apps/${publicEnv.githubAppSlug}/installations/new`} />}>
        Install the GitHub App
      </Button>
    </main>
  );
}
