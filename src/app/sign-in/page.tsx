"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">lookout</h1>
        <p className="text-muted-foreground">Every repo, every open PR, every model in use.</p>
        <Button onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/" })}>
          Sign in with GitHub
        </Button>
      </div>
    </main>
  );
}
