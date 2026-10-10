# lookout

One dashboard for every repo you own: open PRs with CI and review state, and which AI model each project calls, down to file and line. Accounts are GitHub users and orgs, separated the way GitHub separates them.

Live: https://lookout-pied.vercel.app

## How it works

- **Accounts** are GitHub App installations. You see an account only if GitHub lists that installation for you.
- **PR sync** runs nightly from a Vercel cron (`/api/cron/sync`) and on demand from Settings. It lists every repo the installation can see and snapshots open PRs with CI state and review decision.
- **Model scan** runs nightly from GitHub Actions (`.github/workflows/scan.yml`). It pulls each repo as a tarball, greps source and config files for model IDs, normalises them (date suffixes, Bedrock and Vertex forms) and stores file and line. Markdown is skipped on purpose.
- **Registry** at `src/lib/models/registry.ts` is hand-kept. Mark a model `superseded`, `deprecated` or `retired` there and every repo using it is flagged on the Models page with the successor.

Stack: Next.js 16, TypeScript, Tailwind 4, shadcn, Drizzle on Neon Postgres, Better Auth (GitHub login), Vercel.

## One-off setup

1. **Database.** Create a Neon project, then `neon link --project-id <id> --branch production` in the repo. It writes `DATABASE_URL` (pooled) into `.env`.
2. **GitHub App.** Create one at github.com/settings/apps/new with: callback URL `https://<your-domain>/api/auth/callback/github`, **Request user authorization (OAuth) during installation** on, webhook off, repository permissions Contents, Pull requests, Checks and Commit statuses (read), account permission Email addresses (read), installable on any account. Generate a private key.
   Under Optional features, turn off **Expire user authorization tokens**. (If left on, you'll be asked to sign in again every 8 hours.)
3. **Environment.** Set these on Vercel (all environments):
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | from step 1 |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | `https://lookout-pied.vercel.app` |
   | `GITHUB_APP_ID` | `id` from step 2 |
   | `GITHUB_APP_PRIVATE_KEY` | `pem` from step 2, newlines as `\n` |
   | `GITHUB_CLIENT_ID` | `client_id` from step 2 |
   | `GITHUB_CLIENT_SECRET` | `client_secret` from step 2 |
   | `CRON_SECRET` | `openssl rand -hex 32` |
   | `ALLOWED_GITHUB_LOGINS` | comma-separated logins allowed to sign in |
   | `NEXT_PUBLIC_GITHUB_APP_SLUG` | `slug` from step 2 |

   And as repository secrets for the scan workflow: `DATABASE_URL`, `APP_ID`, `APP_PRIVATE_KEY` (GitHub rejects secret names starting with `GITHUB_`).
4. **Install.** Visit `https://github.com/apps/<slug>/installations/new`, install on your user account (and any org later). Sign in at the live URL, open Settings, press Sync now. Run the scan from Actions → scan → Run workflow, or wait for 04:00 UTC.

Deploys run `drizzle-kit migrate` before `next build`, so the schema is applied on every deploy.

## Local development

```sh
pnpm install
cp .env.example .env   # fill it in; neon link fills DATABASE_URL
pnpm db:migrate
pnpm dev
pnpm test
```
