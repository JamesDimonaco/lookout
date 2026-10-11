"use client";

import { Cpu, FolderGit2, GitPullRequest, LogOut, Radar, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Account, AccountSwitcher } from "@/components/account-switcher";
import { type LastSweep, OpsClock } from "@/components/ops-clock";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
import { useSignOut } from "@/components/sign-out-button";

const SECTIONS = [
  { path: "", label: "Overview", icon: Radar, colour: "text-section-overview" },
  { path: "/prs", label: "PRs", icon: GitPullRequest, colour: "text-section-prs" },
  { path: "/models", label: "Models", icon: Cpu, colour: "text-section-models" },
  { path: "/repos", label: "Repos", icon: FolderGit2, colour: "text-section-repos" },
  { path: "/settings", label: "Settings", icon: Settings, colour: "text-section-settings" },
];

export function AppSidebar({
  current,
  accounts,
  user,
  sweep,
}: {
  current: Account;
  accounts: Account[];
  user: { login: string; image: string | null | undefined };
  sweep: LastSweep;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const base = `/${current.login}`;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <Link href={base} className="flex h-8 items-center px-2 text-lg group-data-[collapsible=icon]:px-1.5">
          <Wordmark className="[&>span]:group-data-[collapsible=icon]:hidden" />
        </Link>
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountSwitcher current={current} accounts={accounts} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {SECTIONS.map(({ path, label, icon: Icon, colour }) => {
              const href = base + path;
              const active = path === "" ? pathname === base : pathname.startsWith(href);
              return (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={label}
                    render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                    className="data-active:bg-sidebar-accent data-active:text-brand data-active:shadow-[inset_2px_0_0_var(--primary)]"
                  >
                    <Icon className={colour} />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <OpsClock sweep={sweep} settingsHref={`${base}/settings`} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function UserMenu({ user }: { user: { login: string; image: string | null | undefined } }) {
  const signOut = useSignOut();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={user.login} />}>
        <Avatar size="sm">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{user.login[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate">{user.login}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-48">
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
