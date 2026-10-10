"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <Button onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/", errorCallbackURL: "/sign-in" })}>
      Sign in with GitHub
    </Button>
  );
}
