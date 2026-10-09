"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function Nav({ account }: { account: string }) {
  const pathname = usePathname();
  const base = `/${account}`;
  const items = [
    { href: base, label: "Overview" },
    { href: `${base}/prs`, label: "PRs" },
    { href: `${base}/models`, label: "Models" },
    { href: `${base}/repos`, label: "Repos" },
    { href: `${base}/settings`, label: "Settings" },
  ];
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted",
              active ? "bg-muted font-medium" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
