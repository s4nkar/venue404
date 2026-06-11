# Deployment

API → **Fly.io**, the three React apps → **Vercel**. CI (`.github/workflows/ci.yml`)
runs on every PR; the deploy workflows run on push to `main`.

## API (Fly.io)

One-time:
```bash
brew install flyctl
fly auth login
fly apps create venue404-api          # match `app` in apps/api/fly.toml
# set runtime secrets (never commit these):
fly secrets set \
  DATABASE_URL="postgresql://...supabase.../postgres?sslmode=require" \
  SUPABASE_URL="https://<ref>.supabase.co" \
  SUPABASE_JWT_SECRET="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  STRIPE_SECRET_KEY="sk_live_or_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="Venue404 <no-reply@yourdomain.com>" \
  FRONTEND_BASE_URL="https://app.yourdomain.com" \
  --app venue404-api
fly auth token                         # -> add as GitHub secret FLY_API_TOKEN
```

Deploys happen via `.github/workflows/deploy-api.yml` on push to `main`
(paths `apps/api/**`). **Migrations are not auto-run** — apply them deliberately:
```bash
fly ssh console -C "alembic upgrade head" --app venue404-api
```

GitHub secret required: `FLY_API_TOKEN`.

## Web apps (Vercel)

Create **three** Vercel projects, one per app. For each, set **Root Directory** to
`apps/user-web` / `apps/owner-portal` / `apps/admin-panel`. Vercel auto-detects the
pnpm workspace; `vercel.json` in each app pins framework=vite, build=`pnpm build`,
output=`dist`.

Per-project env vars (Production + Preview):
```
VITE_API_BASE_URL = https://venue404-api.fly.dev
VITE_SUPABASE_URL = https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY = <anon key>     # anon only — never the service role key
```

Deploys via `.github/workflows/deploy-web.yml` (matrix over the 3 apps).
GitHub secrets required:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_IDS` — JSON, e.g.
  `{"user-web":"prj_aaa","owner-portal":"prj_bbb","admin-panel":"prj_ccc"}`

(Alternatively, skip the workflow and use Vercel's native Git integration — point
each project at this repo with its Root Directory set; Vercel builds on push.)

## Stripe webhook (after the API is deployed)

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://venue404-api.fly.dev/api/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the signing secret (`whsec_...`) into the `STRIPE_WEBHOOK_SECRET` Fly secret.
