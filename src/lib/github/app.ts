import { App } from "octokit";
import { env } from "@/env";

const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
});

export function installationOctokit(installationId: number) {
  return app.getInstallationOctokit(installationId);
}

export type InstallationOctokit = Awaited<ReturnType<typeof installationOctokit>>;
