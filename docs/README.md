# venue404
 
A venue booking platform, Owners list venues, users browse and book, admins approve.
 
Built as a modular monolith MVP with a focus on shipping fast on free-tier infrastructure.
 
## Stack
 
- **Frontend:** React 18 + Vite + TypeScript (3 SPAs: user, owner, admin)
- **Backend:** FastAPI (modular monolith) + SQLAlchemy + Alembic
- **Database:** PostgreSQL 16 (local via Docker; Supabase in production)
- **Images:** Cloudinary (Free Plan)
- **Payments:** Stripe (test mode)
- **Email:** Resend (Free Plan)
- **Maps:** OpenStreetMap + Leaflet.js (Free)
- **Logs:** Better Stack / Logtail (Free Plan)
- **Monorepo:** pnpm workspaces
## Project structure
 
```
venue404/
├── apps/
│   ├── user-web/         React SPA — browse & book venues
│   ├── owner-portal/     React SPA — manage venues & bookings
│   ├── admin-panel/      React SPA — approve venues, audit
│   └── api/              FastAPI modular monolith
│       └── app/modules/  → auth, profile, venue, search, booking,
│                           availability, notification, admin, payment ...
├── packages/
│   ├── ui/               Shared React component library
│   └── api-client/       Typed FastAPI client (auto-generated from OpenAPI)
├── docs/                 Architecture, commands, decisions
├── docker-compose.yml    Local Postgres + API
└── pnpm-workspace.yaml
```
 
Each app/package has its own `package.json`. One `pnpm-lock.yaml` at the root locks versions across the whole repo.
 
## Prerequisites
 
- **Node.js 20+** (use [nvm](https://github.com/nvm-sh/nvm) to manage versions)
- **Docker Desktop** running
- **pnpm** (enable via `corepack enable` — comes with Node)
No host Python needed — the API runs entirely inside Docker.
 
## Quick start
 
```bash
# 1. Clone and enter the repo
git clone <repo-url> venue404
cd venue404
 
# 2. Install all JS/TS dependencies (one command, all workspaces)
pnpm install
 
# 3. Set up env files
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in any test keys (Stripe, Resend, Cloudinary)
 
# 4. Start the full stack
pnpm dev:all
```
 
That's it. After `pnpm dev:all` runs you should have:
 
| Service       | URL                          |
|---------------|------------------------------|
| User app      | http://localhost:5173        |
| Owner portal  | http://localhost:5174        |
| Admin panel   | http://localhost:5175        |
| FastAPI       | http://localhost:8000        |
| FastAPI docs  | http://localhost:8000/docs   |
| PostgreSQL    | localhost:5432               |
 
Apply initial database migrations (first time only):
 
```bash
pnpm api:migrate
```
 
## Common commands
 
```bash
# Run everything (Postgres + API + 3 React apps)
pnpm dev:all
 
# Run only the 3 React apps (backend already running)
pnpm dev
 
# Run a single app
pnpm dev:user
pnpm dev:owner
pnpm dev:admin
 
# Database migrations
pnpm api:migrate                            # apply pending migrations
pnpm api:migrate:new "describe change"      # create a new migration
pnpm api:migrate:down                       # roll back the last migration
 
# Quality checks
pnpm typecheck                              # TypeScript across all apps
pnpm lint                                   # ESLint
pnpm format                                 # Prettier
pnpm build                                  # production build (rarely needed in dev)
```
 
For ad-hoc Docker access:
 
```bash
docker compose exec api bash                          # shell into API container
docker compose exec db psql -U postgres -d venue404   # psql into Postgres
docker compose logs -f api                            # tail API logs
```
 
## Workflow basics
 
**After `git pull`:**
 
```bash
pnpm api:migrate   # if teammate added migrations
pnpm dev:all       # start working
```
 
**After changing a SQLAlchemy model:**
 
```bash
pnpm api:migrate:new "add payment_method to bookings"
# review the generated file in apps/api/alembic/versions/
pnpm api:migrate
git add . && git commit
```
 
**Before committing** (ideally automated via pre-commit hooks):
 
```bash
pnpm typecheck
pnpm lint
```
 
## Documentation
 
- [`docs/architecture.md`](./docs/architecture.md) — system architecture, modular monolith rules

## Environment
 
| Environment | Database                              | Hosting                   |
|-------------|---------------------------------------|---------------------------|
| Local       | Docker Postgres                       | Your machine              |
| Staging     | Supabase (project #1)                 | Vercel + Fly.io (staging) |
| Production  | Supabase (project #2)                 | Vercel + Fly.io (prod)    |
 
Same migration files apply across all three, only `DATABASE_URL` changes.
