"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();
  return () => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } });
}

export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
