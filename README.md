This is a [Next.js](https://nextjs.org) project for Skybo.

## Development (recommended)

```bash
npm install
npm run dev
```

`npm run dev` runs migrations, seeds demo data (if needed), and starts Next.js.

Open [http://localhost:3000/login](http://localhost:3000/login).

### Dev environment behavior

Development uses `APP_ENV=development`. **No `.env` file is required** — defaults are applied in [`src/lib/env-config.ts`](./src/lib/env-config.ts) (validated with Zod on startup).

| Feature | Development | Production |
|---------|-------------|------------|
| Database | `file:./data/dev.sqlite` | Your `DATABASE_URL` |
| Twilio SMS | **Disabled** | Required |
| OTP | Any code accepted; login UI is one-step | Real SMS codes |
| Rate limits | Off | On |
| Demo seed | Auto on `npm run dev` | Never |

**Sign in during development:** enter any valid US phone number and click **Sign in** — no SMS is sent.

**Seeded demo accounts** use phones `+1555000XXXX` (e.g. `+15550001001`). The referral network hub is **`+15550009999`**.

### Dev seed controls

| Variable | Effect |
|----------|--------|
| `DEV_SEED_MIN_USERS` | Skip seed when user count is at least this (default `100`) |
| `DEV_SEED_FORCE=1` | Re-seed even if enough users exist (clears data unless reset is set) |
| `DEV_SEED_RESET=1` | Wipe dev tables before seeding |

```bash
# Re-seed without starting the server
DEV_SEED_RESET=1 npm run db:seed

# Next.js only (no migrate/seed)
npm run dev:next
```

### Demo data coverage

Names and locations are generated with [@faker-js/faker](https://fakerjs.dev/) (deterministic per demo phone sequence). Re-seed with `DEV_SEED_RESET=1` to refresh.

The seed creates **100+ groups** and **125+ users** with examples of:

- Solo verified and solo unverified (invited) users
- Partner invites: pending, accepted, declined
- Group referrals: pending, accepted (partial/full confirmation), declined
- Referral chain (4 groups) and star network (hub + spokes)

## Environment variables

Configuration is validated at startup (`src/instrumentation.ts`, `next.config.ts`, scripts, and tests) via **Zod** in `src/lib/env-config.ts`. If required variables are missing, the app exits with a message listing each one.

| Variable | Development | Test | Production |
|----------|-------------|------|------------|
| `APP_ENV` | optional (defaults to `development`) | optional (defaults to `test` via vitest) | **required** `production` (not inferred from `NODE_ENV`) |
| `DATABASE_URL` | default `file:./data/dev.sqlite` | default `file:./data/test.sqlite` | **required** |
| `TURSO_AUTH_TOKEN` | not used | not used | **required** for remote Turso/libSQL |
| `SESSION_SECRET` | insecure dev default | test default | **required** (min 32 chars) |
| `TWILIO_*` | not used | not used | **all three required** |
| `DEV_SEED_*` | optional | — | must not be set |

## Production

Copy [`.env.production.example`](./.env.production.example) to `.env.local` (or your host's secret store) and set:

```
APP_ENV=production
DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...
SESSION_SECRET=...
NEXT_PUBLIC_APP_ENV=production
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...
```

```bash
npm run build
npm run start
```

Production requires Twilio credentials and does not load demo data.

## Staging on Vercel

Use a dedicated Vercel staging project backed by a dedicated Turso database and real Twilio Verify credentials. Treat staging as production-like by keeping `APP_ENV=production`.

- Use a Vercel-managed staging URL first.
- Keep staging data synthetic only.
- Run `npm run staging:ready` before merges/deploys to staging.
- Use `npm run db:seed:staging` only with explicit confirmation when you intentionally want to reset staging data.

See [`docs/staging-deployment.md`](./docs/staging-deployment.md) for the full setup, Vercel workflow, env mapping, and smoke checklist.

## Authentication API

- `POST /api/auth/otp/request` — Send OTP via SMS (production only)
- `POST /api/auth/otp/verify` — Verify OTP and create session
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/me` — Current user, group, referral network

Sessions use an HttpOnly `app_session` cookie (raw token in cookie, hash in database).

See [`docs/auth-verification.md`](./docs/auth-verification.md) for manual verification steps.

## Database

```bash
npm run db:generate   # Generate migrations from schema
npm run db:migrate    # Apply migrations
npm run db:studio     # Drizzle Studio
npm run db:titles:sql -- ./path/to/game-titles.json ./game-titles.sql
```

### Generate SQL for `game_title`

If you already have title metadata in JSON, you can generate SQL inserts for Turso/libSQL:

```bash
npm run db:titles:sql -- ./data/game-titles.json ./data/game-titles.sql
```

The script expects objects like:

```json
[
  {
    "title": "Lost Cities",
    "normalizedTitle": "lost cities",
    "color": "#4338ca",
    "imageUrl": "https://example.com/lost-cities.jpg"
  }
]
```

It generates `INSERT INTO game_title ... ON CONFLICT(normalized_title) DO UPDATE ...` statements, defaults missing `normalizedTitle`, `color`, and `imageUrl`, and marks imported rows as universal titles.

## Tests

```bash
npm run test          # CI-style local gate: unit + component + integration + E2E smoke
npm run test:unit     # Fast pure logic and helper tests
npm run test:component  # Client component tests with jsdom + Testing Library
npm run test:integration # Real SQLite-backed route, store, and server-action tests
npm run test:e2e      # Full Playwright suite
npm run test:e2e:smoke # Playwright smoke coverage for key user flows
npm run test:coverage # Coverage across unit, component, and integration suites
```

Test stack:

- `Vitest` for unit, component, and integration tests
- `React Testing Library` for interactive client components
- `Playwright` for browser smoke and end-to-end flows

Tests use `APP_ENV=test` with a mock OTP provider. Integration tests run against isolated SQLite databases, and Playwright uses the test environment rather than the development auto-login flow.

## Project layout

- `src/app/` — Next.js App Router
- `src/lib/db/` — Drizzle schema and stores
- `src/lib/dev/` — Development seed
- `scripts/dev.ts` — Migrate, seed, start dev server
