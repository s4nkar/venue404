# PRD — Payments, Notifications & Platform (Stripe · Resend · Background Jobs)

> Owner: Alwin · Status: Draft for review · Last updated: 2026-06-04
>
> This PRD scopes **one engineer's slice** of the Venue404 marketplace, built in
> collaboration with 3 other engineers. It covers Payments, Notifications, the
> shared platform services (Stripe, Resend, background jobs), the shared frontend
> packages (`packages/ui`, `packages/api-client`), all DevOps (CI + deploys), and
> ~20–30% venue-module support.
>
> **Nothing in this PRD changes the database without explicit sign-off.** All
> proposed schema changes are listed in §5 and gated behind your approval. Once
> approved, every schema change is applied with exactly two commands (§6).

---

## 1. Background

Venue404 is a venue discovery + booking marketplace with three actors (`customer`,
`venue_owner`, `super_admin`) and three frontends (`user-web`, `owner-portal`,
`admin-panel`) on a FastAPI + PostgreSQL + Supabase Auth backend.

The repo is a pnpm monorepo:

```
apps/api            FastAPI backend (SQLAlchemy + Alembic)
apps/user-web       React (customer)
apps/owner-portal   React (venue owner)
apps/admin-panel    React (super admin)
packages/ui         Shared React component library
packages/api-client Shared typed API + Supabase auth client
```

The backend is fully scaffolded, but most modules outside auth are **stubs**
(`raise NotImplementedError` / `pass`). Only the auth schema (`profiles`,
`user_roles`, `admin_actions`) has a real migration (`0001`, `0002`).

---

## 2. Goals

1. A correct, race-safe **payment + refund flow** on Stripe that enforces the
   booking invariants in `CLAUDE.md` (one confirmed booking per slot; losing
   payers auto-refunded; transactional confirmation).
2. A **notification system** delivering email (Resend) + in-app notifications for
   every booking lifecycle event.
3. **Background jobs** that drive time-based state transitions (hold expiry,
   payment reminders, booking completion, stale-request expiry).
4. A **platform layer**: idempotent Stripe webhook ingestion, an append-only
   money ledger, and owner payout requests.
5. Production-ready **shared packages** (`ui`, `api-client`) consumed by all 3 apps.
6. **DevOps**: CI (lint, typecheck, test, migration check) and deploy pipelines.
7. **Venue support** (~20–30%): photos, cancellation policies, and the venue-side
   data the payment/refund math depends on.

### Non-goals (owned by other engineers)

- Core auth/provider abstraction (done).
- Core venue CRUD, search, availability rules.
- Core booking state machine + request/accept flow.
- Admin moderation workflows.
- Frontend app screens (we provide shared components + client, not the pages).

---

## 3. Non-negotiable invariants (from `CLAUDE.md`)

These constrain every design decision below:

- Only **one confirmed booking** may exist per slot.
- Acceptance does **not** reserve a slot; only successful token payment does.
- Confirmation requires token payment within a **24-hour hold**.
- On confirmation, all competing requests → `conflict_canceled`.
- User cancellation may reactivate competing `conflict_canceled` requests.
- Owner cancellation **always** refunds advance + remaining payment.
- Payment confirmation must be **transactional** with **row locking** and a
  **unique active-booking constraint** — two successful confirmations for one
  slot must be impossible.
- Losing payment attempts are **automatically refunded**.
- Money is integer **paise** — never floating point.
- Stripe webhooks must be **idempotent** (replay-safe).
- `ledger_entries`, `admin_actions`, `booking_status_history` are **append-only**.
- Frontend authorization is UX only; backend is authoritative.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` never reach the browser.

---

## 4. Current-state assessment (my scope)

| Module | File | State |
|--------|------|-------|
| Payment service | `apps/api/app/modules/payment/service.py` | stub (`NotImplementedError`) |
| Payment webhooks | `apps/api/app/modules/payment/webhooks.py` | stub |
| Payment model | `apps/api/app/modules/payment/models.py` | **diverges from PDF** (see §5.2) |
| Notification service | `apps/api/app/modules/notification/service.py` | stub |
| Notification model | `apps/api/app/modules/notification/models.py` | **diverges from PDF** (see §5.3) |
| Jobs | `apps/api/app/jobs/*.py` | all `pass`; scheduler wired in but `start()` not called from `main.py` |
| api-client | `packages/api-client/scripts/generate.ts` | type generation is a TODO (`console.log` only) |
| api-client endpoints | `packages/api-client/src/endpoints/*` | typed as `unknown`; no notifications endpoint |
| CI | `.github/` | only `PULL_REQUEST_TEMPLATE.md` — **no workflows** |
| Deploy | — | none |

---

## 5. Proposed schema changes — **REQUIRES YOUR APPROVAL**

> ⚠️ Do not run any migration until you approve this section. Each item notes
> *what* changes and *why*. I expect you to push back on some of these.

### 5.0 Blocker — Alembic autogenerate is blind to my models

`apps/api/alembic/env.py` imports only `profile` and `admin` models. Autogenerate
therefore **cannot see** venue, booking, payment, or notification models, so no
migration in my scope can be generated. **Proposed:** add the missing model imports
to `env.py`. This is a prerequisite for every other change here.

### 5.1 Money is paise (integer), not float

`payment/models.py` and `venue/models.py` use `Float`. `CLAUDE.md` mandates integer
paise. **Proposed:** all money columns become `BigInteger` `*_paise`.

### 5.2 Payments: align to the PDF ledger model

The PDF design has **no `payments` / `refunds` tables**. Instead money state lives on
`bookings` (`payment_status`, `amount_paise`, `refund_paise`, Stripe PI refs) plus
three append-only/auxiliary tables:

- `ledger_entries` — append-only money movements (charge, refund, payout).
- `payout_requests` — owner withdrawal requests.
- `stripe_events` — raw webhook payloads keyed by Stripe event ID (idempotency).

**Proposed:** replace the `payments`/`refunds` tables with the PDF model. *Open
question for you:* keep a thin `payments` table as a convenience read-model, or go
strictly ledger-only as the PDF implies? My recommendation: **ledger-only** + booking
columns, to keep a single source of truth.

### 5.3 Notifications: align to the PDF

Current model: FK → `users.id`, columns `message` / `is_read`. PDF: FK → `profiles.id`,
columns `type`, `title`, `body`, `read_at`, `sent_at`, plus `booking_id`. **Proposed:**
adopt the PDF shape (richer, supports email send-tracking + deep links to bookings).

### 5.4 `profiles.id` vs `users.id` foreign keys

`booking`, `venue`, `notification`, `payment` models reference `users.id`, but the
auth migration created `profiles` (mirroring `auth.users.id`). Per `CLAUDE.md`,
`profiles.id == auth.users.id`. **Proposed:** all app FKs target `profiles.id`.
*(This touches other engineers' models — I will coordinate, not change unilaterally.)*

### 5.5 Config: Resend, not SMTP

`core/config.py` exposes SMTP vars (`smtp_host`, `smtp_port`, …) but the platform
uses **Resend**. **Proposed:** add `resend_api_key`, `email_from`, and
`frontend_base_url` (for links in emails); keep SMTP only if you want a fallback.

### 5.6 Booking columns the payment flow depends on (coordination item)

For transactional confirmation + auto-refund I need, on `bookings`:
`status` (8-state enum), `payment_status`, `amount_paise`, `refund_paise`,
`stripe_payment_intent_id`, `accepted_at`, `hold_expires_at`, and a **partial unique
index** enforcing one `confirmed` booking per slot. The booking core is another
engineer's module; I'll propose these as a shared migration and align with them
before touching it.

---

## 6. Schema-change workflow (the two commands)

Whenever an approved schema change requires a migration:

```bash
# 1. Generate the migration from model changes
pnpm api:migrate:new "describe the change"
#    → docker compose exec api alembic revision --autogenerate -m "describe the change"

# 2. Review the generated file in apps/api/alembic/versions/, then apply it
pnpm api:migrate
#    → docker compose exec api alembic upgrade head
```

Rollback if needed: `pnpm api:migrate:down` (`alembic downgrade -1`).

**Rule:** I will always show you the model diff + the generated migration before
`pnpm api:migrate` runs.

---

## 7. Functional requirements

### 7.1 Payments (Stripe)

- **Create payment intent** for a booking's token advance. Validates: caller owns
  the booking, booking is `accepted`, hold not expired, amount matches the venue's
  pricing snapshot.
- **Confirm on webhook** (`payment_intent.succeeded`): transactionally move booking
  `accepted → confirmed`, write a `ledger_entries` charge row, set the slot blocking,
  and `conflict_cancel` competing requests — all under a row lock + unique constraint.
- **Refunds**: owner cancellation refunds advance + remaining; losing payers
  auto-refunded; each refund writes a ledger row and updates `booking.refund_paise`.
- **Idempotency**: every webhook is recorded in `stripe_events` first; duplicate
  event IDs are no-ops.
- **Payouts**: owners request payouts (`payout_requests`); platform fee retained.

### 7.2 Notifications (Resend + in-app)

- Emit on: request received, request accepted, payment reminder, payment confirmed,
  hold expired, conflict-canceled, cancellation, refund issued, completion.
- Each event creates an in-app `notifications` row **and** sends a Resend email,
  recording `sent_at`. In-app list + mark-read endpoints.
- Templates live under `apps/api/app/modules/notification/templates/`.

### 7.3 Background jobs (APScheduler)

- `hold_expiry` (hourly): `accepted → hold_expired` when 24h passed unpaid.
- `payment_reminders` (daily): T-7 / T-3 / T-1 reminders.
- `booking_completion` (daily): `confirmed → completed` when event date passed and
  no pending payments/disputes/cancellations.
- `stale_requests` (6-hourly): `requested → request_expired` after 7 days.
- Wire `scheduler.start()` into `main.py` lifespan (currently not called).

### 7.4 Shared packages

- `packages/api-client`: implement real OpenAPI → TS type generation
  (`scripts/generate.ts`); type the endpoints (currently `unknown`); add a
  notifications + payments endpoint surface.
- `packages/ui`: payment/notification UI primitives (payment status badge,
  notification list item, refund/confirm dialogs) consumed by all 3 apps.

### 7.5 Venue support (~20–30%)

- `venue_photos` (cover-photo rule), `venue_cancellation_policies` (drives refund
  math), and the venue pricing-snapshot fields the payment flow reads.

### 7.6 DevOps

- **CI** (`.github/workflows/ci.yml`): pnpm install → lint → typecheck → frontend
  build; Python: install → pytest → **alembic migration check** (autogenerate must
  produce no diff against models).
- **Deploy**: container build + deploy for `apps/api`; static deploy for the 3 apps.

---

## 8. Verification strategy

Every protected feature ships with auth + authorization + ownership tests
(`CLAUDE.md` testing requirements). Critical paths to cover:

- Payment confirmation is transactional; concurrent confirmations cannot both win.
- Losing payers are refunded.
- Webhook replay is idempotent.
- Owner cancellation refunds fully.
- Jobs transition state correctly at the time boundaries.

Local verification: `docker compose up`, run pytest in the api container, hit
endpoints via the OpenAPI docs, and use Stripe CLI (`stripe listen`) to replay
webhooks.

---

## 9. Open questions for you

1. **§5.2** — ledger-only, or keep a thin `payments` read-model table?
2. **§5.5** — Resend only, or keep SMTP as a fallback?
3. **§5.6** — am I cleared to propose the shared booking-column migration, or will
   the booking-owner engineer add those columns and I consume them?
4. Stripe mode for dev/CI: test keys in CI, or mock the Stripe client entirely?
5. Deploy target (Fly.io / Render / AWS / other) — drives the deploy workflow.
