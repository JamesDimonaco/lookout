import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
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
  const [accounts, cookieStore] = await Promise.all([getUserAccounts(session.user.id), cookies()]);
  return (
    <SidebarProvider defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}>
      <AppSidebar
        current={{ login: account.login, type: account.type, avatarUrl: account.avatarUrl }}
        accounts={accounts}
        user={{ login: session.user.githubLogin, image: session.user.image }}
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

export const instant = false;
