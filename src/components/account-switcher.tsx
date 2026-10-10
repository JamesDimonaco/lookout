"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

type Account = { login: string; type: "User" | "Organization"; avatarUrl: string | null };

export function AccountSwitcher({ current, accounts }: { current: Account; accounts: Account[] }) {
  const { setOpenMobile } = useSidebar();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={current.login} />}>
        <AccountAvatar account={current} />
        <span className="grid flex-1 text-left leading-tight">
          <span className="truncate font-medium">{current.login}</span>
          <span className="text-xs text-muted-foreground">{kind(current)}</span>
        </span>
        <ChevronsUpDown className="ml-auto opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {accounts.map((a) => (
          <DropdownMenuItem
            key={a.login}
            render={<Link href={`/${a.login}`} />}
            onClick={() => setOpenMobile(false)}
          >
            <AccountAvatar account={a} />
            <span>{a.login}</span>
            <span className="ml-auto text-xs text-muted-foreground">{kind(a)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function kind(a: Account) {
  return a.type === "Organization" ? "org" : "user";
}

function AccountAvatar({ account }: { account: Account }) {
  return (
    <Avatar size="sm" className="rounded-md after:rounded-md">
      {account.avatarUrl && <AvatarImage src={account.avatarUrl} alt="" className="rounded-md" />}
      <AvatarFallback className="rounded-md">{account.login[0].toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
