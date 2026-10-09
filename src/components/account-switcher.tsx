"use client";

import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Account = { login: string; type: "User" | "Organization"; avatarUrl: string | null };

export function AccountSwitcher({ current, accounts }: { current: string; accounts: Account[] }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2 font-medium" />}>
        {current}
        <ChevronsUpDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {accounts.map((a) => (
          <DropdownMenuItem key={a.login} onSelect={() => router.push(`/${a.login}`)}>
            <span>{a.login}</span>
            <span className="ml-auto text-xs text-muted-foreground">{a.type === "Organization" ? "org" : "user"}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
