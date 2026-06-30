# Deployment

API → **Render**, the three React apps → **Vercel**. Both deploy automatically on
push to `main` via each platform's native Git integration. CI
(`.github/workflows/ci.yml`) runs on every PR and is the merge gate — enable
branch protection on `main` requiring the **CI** checks, so only green code
reaches `main` (the branch both platforms deploy).

## API (Render)

The API is deployed as a **Render Web Service** defined as code in
[`render.yaml`](../render.yaml) (a Blueprint). It builds from `apps/api/Dockerfile`
and auto-deploys on push to `main` when `apps/api/**` changes.

One-time:

1. **Render → New → Blueprint** and connect this repo (Render reads `render.yaml`).
2. Create an **Environment Group** named `venue404-api` with these variables
   (never commit them):
   ```
   DATABASE_URL=postgresql://...supabase.../postgres?sslmode=require
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_JWT_SECRET=...
   SUPABASE_SERVICE_ROLE_KEY=...
   STRIPE_SECRET_KEY=sk_live_or_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   RESEND_API_KEY=re_...
   EMAIL_FROM=Venue404 <no-reply@yourdomain.com>
   FRONTEND_BASE_URL=https://app.yourdomain.com
   CORS_ORIGINS=https://user-web.vercel.app,https://owner-portal.vercel.app,https://admin-panel.vercel.app
   JOB_RUNNER_TOKEN=<long random secret>
   # plus super-admin / Cloudinary vars as needed
   ```
   `ENABLE_JOBS` is set to `false` in `render.yaml` — the in-process scheduler
   stays off; jobs run via the scheduled workflow below.
3. Render injects a dynamic `$PORT`; the Dockerfile binds it. Healthcheck is
   `/health`.

**Notes on the free tier:** the web service is free but **spins down after
~15 min idle** (≈50s cold start). The keepalive workflow (below) keeps it warm.

### Migrations (manual — never automated)

Apply migrations deliberately against the production DB from `apps/api`:
```bash
DATABASE_URL="postgresql://...supabase.../postgres?sslmode=require" alembic upgrade head
```
Neither CI nor the deploy runs Alembic.

## Background jobs (free, via GitHub Actions)

Jobs run by calling the token-guarded `POST /api/internal/run-jobs` endpoint on
the live API. Two workflows drive it:

- [`.github/workflows/keepalive.yml`](../.github/workflows/keepalive.yml) — pings
  `GET /health` every 13 min so the free service stays warm.
- [`.github/workflows/jobs.yml`](../.github/workflows/jobs.yml) — triggers each
  job at its original cadence:
  | Cron | Jobs |
  |------|------|
  | `0 * * * *` (hourly) | `hold_expiry`, `payment_reminders` |
  | `0 */6 * * *` (6-hourly) | `request_expiry`, `overdue_flag`, `overdue_autocancel` |
  | `0 0 * * *` (daily) | `completion` |

Run jobs manually any time via the **Run workflow** button (`workflow_dispatch`)
on `jobs.yml`, or locally with `python run_job.py all` / `python run_job.py <name>`.

Required **GitHub Actions secrets**:
- `API_BASE_URL` — the Render service URL, e.g. `https://venue404-api.onrender.com`
- `JOB_RUNNER_TOKEN` — must equal the Render `JOB_RUNNER_TOKEN`

> On a **private** repo the 13-min keepalive exceeds GitHub's 2,000-min/month free
> Actions budget — use a free external pinger (UptimeRobot, cron-job.org) for the
> keepalive (and optionally the job triggers; they can send the `X-Job-Token`
> header). On a **public** repo, Actions minutes are free.

## Web apps (Vercel)

Create **three** Vercel projects, one per app, using Vercel's native Git
integration (auto-deploys on push to `main`).

For each project:
- **Root Directory** = `apps/user-web` / `apps/owner-portal` / `apps/admin-panel`.
  Vercel auto-detects the pnpm workspace; each app's `vercel.json` pins
  framework=vite, build=`pnpm build`, output=`dist`.
- **Ignored Build Step** (rebuild only when the app or shared packages change):
  ```bash
  git diff --quiet HEAD^ HEAD -- apps/<app> packages
  ```
- Per-project env vars (Production + Preview):
  ```
  VITE_API_BASE_URL = https://venue404-api.onrender.com   # the Render URL
  VITE_SUPABASE_URL = https://<ref>.supabase.co
  VITE_SUPABASE_ANON_KEY = <anon key>     # anon only — never the service role key
  ```
  (`user-web` also needs `VITE_STRIPE_PUBLISHABLE_KEY` + the cross-app URLs;
  `owner-portal` also needs the cross-app URLs — see each `.env.example`.)

After the API URL is live, set each project's `VITE_API_BASE_URL` and add the
Vercel domains to the Render `CORS_ORIGINS`.

## Stripe webhook (after the API is deployed)

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://venue404-api.onrender.com/api/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the signing secret (`whsec_...`) into the `STRIPE_WEBHOOK_SECRET` Render var.
