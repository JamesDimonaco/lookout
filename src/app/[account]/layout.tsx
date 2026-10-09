import { AccountSwitcher } from "@/components/account-switcher";
import { Nav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out-button";
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
  const accounts = await getUserAccounts(session.user.id);
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <AccountSwitcher current={account.login} accounts={accounts} />
          <Nav account={account.login} />
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
