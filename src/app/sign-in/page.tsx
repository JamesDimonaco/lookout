import { Radar } from "@/components/radar";
import { SignOutButton } from "@/components/sign-out-button";
import { Wordmark } from "@/components/wordmark";
import { SignInButton } from "./sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; denied?: string; error?: string }>;
}) {
  const { reauth, denied, error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Radar className="w-full max-w-64" />
        <h1 className="text-4xl">
          <Wordmark />
        </h1>
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
            {error && (
              <p className="text-sm text-destructive">
                Sign-in failed ({error.replaceAll("_", " ")}). Sign-in attempts expire after 10 minutes; try again.
              </p>
            )}
            <SignInButton />
          </>
        )}
      </div>
    </main>
  );
}

export const instant = false;
