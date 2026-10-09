import { App } from "octokit";

// Reads process.env directly (not src/env.ts) so scripts/scan.ts can run outside Next.
const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
if (!appId || !privateKey) throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set");

const app = new App({ appId, privateKey: privateKey.replace(/\\n/g, "\n") });

export function installationOctokit(installationId: number) {
  return app.getInstallationOctokit(installationId);
}

export type InstallationOctokit = Awaited<ReturnType<typeof installationOctokit>>;
