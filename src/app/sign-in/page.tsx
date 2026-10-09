import { SignOutButton } from "@/components/sign-out-button";
import { SignInButton } from "./sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; denied?: string }>;
}) {
  const { reauth, denied } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">lookout</h1>
        {denied ? (
          <>
            <p className="text-muted-foreground">This GitHub account is not on the allowlist.</p>
            <SignOutButton />
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              {reauth ? "Your GitHub token expired. Sign in again to refresh it." : "Every repo, every open PR, every model in use."}
            </p>
            <SignInButton />
          </>
        )}
      </div>
    </main>
  );
}

export const instant = false;
