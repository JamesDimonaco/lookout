import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
import { db } from "@/db";
import { syncRuns } from "@/db/schema";
import { getUserAccounts, requireAccount } from "@/lib/accounts";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ account: string }>;
}) {
  const { account: login } = await params;
  const { account, session } = await requireAccount(login);
  const [accounts, cookieStore, [lastSync]] = await Promise.all([
    getUserAccounts(session.user.id),
    cookies(),
    db
      .select({ startedAt: syncRuns.startedAt, status: syncRuns.status })
      .from(syncRuns)
      .where(eq(syncRuns.accountId, account.id))
      .orderBy(desc(syncRuns.startedAt))
      .limit(1),
  ]);
  return (
    <SidebarProvider defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}>
      <AppSidebar
        current={{ login: account.login, type: account.type, avatarUrl: account.avatarUrl }}
        accounts={accounts}
        user={{ login: session.user.githubLogin, image: session.user.image }}
        sweep={lastSync ? { at: formatSweep(lastSync.startedAt), status: lastSync.status } : null}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 bg-background/90 px-3 backdrop-blur">
          <SidebarTrigger />
          <Wordmark className="md:hidden" />
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Formatted on the server in UTC, so the server and client render the same string.
function formatSweep(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export const instant = false;
