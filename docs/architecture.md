# Architecture

This document captures the system design and the rationale behind key decisions. Read this after the [README](./README.md) — it's the deeper "why and how" of how venue404 is built.

For the visual overview, see the [HLD diagram](https://drive.google.com/file/d/1dygoeJaWBjRntRdI4wqXOW7DEp6SJnQz/view?usp=sharing).

---

## Overview

venue404 is a venue booking platform with three user roles: **users** (browse and book), **owners** (list and manage venues), and **admins** (approve venues and audit activity). The system is built as a **modular monolith**: one deployable backend with internally separated modules, three independent React frontends, and one shared PostgreSQL database.

The architecture optimizes for two things:

1. **Shipping speed.** One backend deployable, free-tier infrastructure, no premature distributed-systems complexity.
2. **A clean extraction path.** If any module ever needs to scale separately (likely Payment or Search), it can be lifted into its own service without rewriting the system.

---

## Architectural pattern: Modular monolith

The backend is a single FastAPI application organized into self-contained modules under `apps/api/app/modules/`. Each module owns its routes, schemas, models, and business logic. Cross-module communication happens through **service interfaces**, never through direct model or database access.

```
apps/api/app/
├── core/        ← infrastructure: DB session, JWT, config
├── shared/      ← reusable utilities (base models, pagination)
├── modules/     ← business modules (the 9 modules below)
└── jobs/        ← background jobs (APScheduler)
```

### Why modular monolith, not microservices?

For an MVP with one team, microservices add operational overhead (multiple deploys, service discovery, distributed tracing, eventual consistency) without proportional benefit. A modular monolith gives the **logical separation** of microservices without the **physical complexity**.

The boundaries are enforced through convention — not the network — but the cost of crossing them improperly is a code review failure, not a production outage.

### When to consider extracting a module

A module is a candidate for extraction into its own service when:

- It has dramatically different scaling needs than the rest (e.g. Payment hits during peak booking hours; Search hits constantly).
- It needs a different language or runtime.
- It needs independent deploy cadence for safety or compliance reasons.
- Multiple teams own different modules and step on each other during deploys.

None of these apply yet. Stay monolithic until they do.

---

## Modules

| Module           | Responsibility                                                            |
|------------------|---------------------------------------------------------------------------|
| **auth**         | JWT issuance/validation, login, signup, role claims                       |
| **profile**      | User, owner, admin profiles                                               |
| **venue**        | Venue CRUD, photo management, approval state                              |
| **search**       | Discovery: filtering by city, type, capacity, price, date range           |
| **booking**      | Booking lifecycle: request → accept → confirm → complete (state machine)  |
| **availability** | Time slots, blocked dates, overlap detection                              |
| **notification** | In-app notifications + transactional email (via Resend)                   |
| **admin**        | Venue approval workflow, suspensions, audit log                           |
| **payment**      | Stripe checkout, refunds, webhook handling                                |

Each module folder looks like:

```
modules/booking/
├── routes.py        FastAPI router
├── schemas.py       Pydantic request/response models
├── models.py        SQLAlchemy ORM models
├── service.py       Business logic
└── dependencies.py  FastAPI dependencies (e.g. require_owner_role)
```

### Module rules (enforced by code review)

These rules exist to keep modules genuinely modular. Breaking them is what turns a "modular monolith" into a regular monolith.

1. **Modules do not import other modules' models or query each other's tables.**
   If `booking` needs venue data, it calls `venue.service.get_venue_by_id(id)`. It does not `from app.modules.venue.models import Venue`.

2. **Service functions are the only public API of a module.**
   Models, schemas, and internal helpers are private. Other modules don't know they exist.

3. **Shared utilities go in `shared/`, not in modules.**
   Resist the urge to put business logic in `shared/`. If two modules need similar logic, it usually means one of them should own it and the other should call its service.

4. **Cross-cutting infrastructure goes in `core/`.**
   Database session, auth middleware, config, exception handlers. These are imported everywhere; they're not modules.

5. **A module that doesn't own data still has a `service.py`.**
   Example: `search` has no models of its own — it queries via `venue.service`. But it still has a `search/service.py` that orchestrates the search logic, so callers depend on `search`, not on `venue` internals.

---

## Data model

The core entities and how they relate:

```
User ──< Booking >── Venue
              │           │
              │           └── VenuePhoto
              │           └── BlockedDate
              ├── Payment
              └── StatusHistory
```

Key entities:

- **User** — accounts for all three roles (user/owner/admin), distinguished by a `role` field.
- **Venue** — owned by a user (owner), has photos and blocked dates. Has an `approval_state` (pending/approved/rejected/suspended).
- **Booking** — links a user to a venue for a specific time range. Carries the booking status (see state machine below).
- **StatusHistory** — append-only log of status transitions for a booking. Used for audit and dispute resolution.
- **Payment** — Stripe payment intent records, linked to bookings.

### Critical DB-level constraint

The booking system relies on a **PostgreSQL exclusion constraint** to prevent overlapping bookings at the database layer:

```sql
ALTER TABLE bookings
ADD CONSTRAINT no_overlap
EXCLUDE USING gist (
    venue_id WITH =,
    tstzrange(start_time, end_time) WITH &&
) WHERE (status IN ('confirmed', 'accepted'));
```

This means: even if two race-condition requests get past application-level checks, the database itself rejects the second insert. **Do not rely solely on application code to prevent double-booking.** The exclusion constraint is the source of truth.

This constraint is added in a hand-edited migration (Alembic's autogenerate does not detect it).

---

## The booking state machine

This is the most important business flow in the system. Get it wrong and you have angry users, missed payments, or double-bookings.

### Status definitions

| Status              | Meaning                                                        |
|---------------------|----------------------------------------------------------------|
| `requested`         | User submitted a booking, awaiting owner decision              |
| `accepted`          | Owner picked this user; 24-hour payment hold is active         |
| `confirmed`         | Token advance paid; slot is locked                             |
| `completed`         | Event date has passed                                          |
| `hold_expired`      | Accepted user did not pay within 24 hours                      |
| `request_expired`   | Request sat with no movement for 7+ days                       |
| `conflict_canceled` | Another user got this slot                                     |
| `canceled_by_user`  | User cancelled a confirmed booking                             |
| `canceled_by_owner` | Owner cancelled (any stage)                                    |
| `rejected`          | Owner rejected the initial request                             |

### Happy path

```
1. User submits booking request          → status = requested
2. Owner reviews all requesters,
   picks one (exclusive selection)       → that user: accepted
                                            others: stay requested
3. Selected user pays token advance      → that user: confirmed
   within 24 hours                         others: conflict_canceled
4. User pays remaining amount before
   deadline (N days before event)
5. Event date passes                     → status = completed
```

### Key rules

- **Owner acceptance is exclusive.** Picking one user does not auto-reject others; they stay `requested` so the owner can fall back to them if the picked user doesn't pay.
- **Auto-confirmation on payment.** No manual "confirm" step by the owner — Stripe webhook → status update.
- **24-hour payment hold.** If the accepted user doesn't pay in time, status → `hold_expired`, owner is notified to pick the next requester from the still-`requested` pool.
- **7-day request expiry.** Requests with no movement for a week auto-expire to `request_expired` to keep the owner's queue clean.
- **Payment deadline (remaining amount).** Reminders sent at T-7, T-3, T-1 days. On deadline day, owner is notified with options (extend / cancel-forfeit / cancel-with-refund). If owner doesn't act within 48-72 hours, system auto-cancels with advance forfeited.

### Cancellation policy

| Initiator         | Token advance | Remaining (if paid) | Effect on others                              |
|-------------------|---------------|---------------------|-----------------------------------------------|
| Owner cancels     | Refunded      | Refunded            | Owner may reactivate `conflict_canceled` users |
| User cancels      | **Forfeited** | Refunded            | `conflict_canceled` users auto-reactivate     |

Payment gateway fees on refunds: **TBD** — needs decision before launch. Current default: platform absorbs for owner cancellations, deducted from refund for user cancellations.

---

## Background jobs

Time-based logic runs via **APScheduler** running in-process within the FastAPI app:

- **Hold expiry** — every 5 minutes, find `accepted` bookings where the 24-hour hold has passed without payment; move to `hold_expired`, notify owner.
- **Stale request cleanup** — daily, expire `requested` bookings older than 7 days.
- **Payment reminders** — daily, send T-7, T-3, T-1 reminders for confirmed bookings approaching the remaining-payment deadline.
- **Booking completion** — daily, move `confirmed` bookings past their event date to `completed`.

### Caveat for future scaling

APScheduler runs in-process, so jobs fire on every FastAPI instance. **The system currently assumes a single FastAPI instance.** When scaling to multiple instances:

- Add Redis + a distributed lock (e.g. via `redis-py-lock`) so each job runs exactly once across the fleet.
- Or migrate to a proper job runner (Celery, RQ, Dramatiq) with a dedicated worker process.

Not needed for MVP. Tag this in code so it's visible when revisited.

---

## Authentication & authorization

- **JWT-based**, stateless. Issued by the `auth` module on login/signup, validated on every request via FastAPI middleware in `core/security.py`.
- **Tokens carry the user ID and role claim** (`user` / `owner` / `admin`).
- **Role enforcement** happens in module dependencies — e.g. `Depends(require_owner)` on a route.
- **No external auth provider.** Plain bcrypt password hashing + JWT. If/when social login is needed, plug in Auth0, Supabase Auth, or Clerk later.

---

## External services

| Service          | Purpose                  | Why this one                                                  |
|------------------|--------------------------|---------------------------------------------------------------|
| **Stripe**       | Payments                 | Industry standard, test mode is generous, webhook model is solid |
| **Cloudinary**   | Venue photos + image CDN | Free tier covers MVP; transformations on the fly              |
| **Resend**       | Transactional email      | Modern API, 3k emails/month free, simpler than SendGrid       |
| **OpenStreetMap** + Leaflet | Venue map previews | Free, no API key, no quota anxiety                            |
| **Better Stack** | Log aggregation          | Free tier sufficient for MVP traffic                          |

All external services are accessed only from their respective modules — Stripe from `payment`, Cloudinary from `venue`, Resend from `notification`. No module should call an external service that isn't "theirs."

---

## Frontend architecture

Three independent React SPAs in `apps/`:

- **user-web** — public-facing, browse and book venues
- **owner-portal** — venue management, accept/reject requests, view bookings
- **admin-panel** — venue approval, user suspension, audit log

All three are Vite + React 18 + TypeScript. They share code through two workspace packages:

- **`@venue404/ui`** — design system: buttons, inputs, cards, modals, date pickers. React is declared as a `peerDependency` to avoid multiple React instances.
- **`@venue404/api-client`** — typed FastAPI client. TypeScript types are **auto-generated from FastAPI's `/openapi.json`** schema, so backend changes surface as compile-time errors in the frontend.

### Why three apps instead of one with role-based routing?

Three apps means:
- Smaller bundle sizes — users don't download admin code.
- Clearer separation of concerns; teams (or your future self) can iterate on one without risking the others.
- Independent deploys — a bug in the admin panel doesn't block a user-facing fix.

The tradeoff is some shared infra duplication (auth context, layout shells). This is mitigated by the shared `@venue404/ui` package.

---

## Hosting & environments

| Environment  | Database                  | Backend           | Frontends                  |
|--------------|---------------------------|-------------------|----------------------------|
| Local        | Postgres 16 (Docker)      | FastAPI (Docker)  | Vite dev server (native)   |
| Staging      | Supabase (project #1)     | Fly.io (Mumbai)   | Vercel preview deploys     |
| Production   | Supabase (project #2)     | Fly.io (Mumbai)   | Vercel production deploys  |

- **Same Docker image** runs in local and production (just different env vars).
- **Same migration files** apply across all three environments — only `DATABASE_URL` differs.
- **Fly.io Mumbai region** is chosen for proximity to the target user base (India).
- **Vercel hosts each React app as its own project** with its own domain (`app.`, `owner.`, `admin.`).

---

## Things deliberately NOT in the MVP

These are tracked but out of scope for v1:

- **Redis** — caching, distributed locks, session storage. Not needed at MVP scale.
- **Microservices** — see "modular monolith" rationale.
- **Real-time features** (live booking updates, chat). WebSockets / Server-Sent Events can come later.
- **Multi-region** — single Mumbai deploy is enough for India-first launch.
- **Mobile apps** — web-only initially. Native apps wrap or rewrite later if traction warrants.
- **Advanced search** (Elasticsearch, vector search). Postgres full-text + filters is enough until it isn't.
- **Multi-tenant venue chains** — assumed one venue per owner record for now.

---

## Future scaling path (in rough order of likelihood)

If/when you hit limits, attack in this order:

1. **Vertical scale Fly.io** instance — bigger machine, cheap and immediate.
2. **Read replicas on Supabase Pro** — separate read/write paths for Search and listing endpoints.
3. **Move APScheduler to a dedicated worker** with Redis-backed job queue (Celery or Dramatiq).
4. **Extract Search module** into its own service with Elasticsearch / Meilisearch / vector search.
5. **Extract Payment module** for compliance isolation and independent deploys.
6. **Add CDN caching** for venue listing pages (Cloudflare or Vercel Edge).
7. **Multi-region** — replicate Postgres, deploy Fly.io to additional regions.

Each step is a real engineering investment. Don't pre-build. Wait for the metric that justifies it.

---

## References

- [HLD diagram](./hld.drawio) — visual system overview
- [Booking flow](./booking-flow.md) — full state machine with branch diagrams
- [DB commands](./commands.db.md) — Alembic + migration workflow
- [pnpm commands](./commands/pnpm.md) — monorepo + workspace workflow

---

## Decision log

Track significant architectural decisions here as they're made.

| Date       | Decision                                                              | Rationale                                                            |
|------------|-----------------------------------------------------------------------|----------------------------------------------------------------------|
| 2026-05    | Modular monolith over microservices                                   | Single-team MVP, optimize for shipping speed                         |
| 2026-05    | Three React SPAs over one role-routed app                             | Bundle size, deploy independence, clearer ownership                  |
| 2026-05    | pnpm workspaces over npm/yarn                                         | Disk savings, strict dependency resolution, monorepo-first design    |
| 2026-05    | APScheduler in-process over Celery/Redis                              | Simpler for MVP; single instance assumed                             |
| 2026-05    | Cloudinary over S3                                                    | Free tier covers MVP; image transformations included                 |
| 2026-05    | Fly.io Mumbai over Render/Railway                                     | Proximity to India-based user base                                   |
| 2026-05    | DB exclusion constraint as source of truth for slot overlaps          | Prevents race conditions even if app code has bugs                   |
| 2026-05    | Owner-picks-one acceptance model over first-come-first-served         | Gives owners control; standard for venue/event bookings              |
| 2026-05    | User-cancels = advance forfeited; owner-cancels = full refund         | Standard industry policy; reflects who broke the commitment          |

When making a new significant decision (new external service, new module, new pattern), add a row here so future contributors understand *why* the system looks the way it does.