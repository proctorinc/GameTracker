# Staging Deployment: Vercel + Turso

This app treats staging as a production-like deployment:

- `APP_ENV=production`
- dedicated Turso database
- real Twilio Verify credentials
- synthetic-only data
- Vercel-managed staging URL

## Required staging environment variables

Configure these in the Vercel staging project:

```bash
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
DATABASE_URL=libsql://<your-staging-db>.turso.io
TURSO_AUTH_TOKEN=<turso-auth-token>
SESSION_SECRET=<32+ char random secret>
TWILIO_ACCOUNT_SID=<twilio account sid>
TWILIO_AUTH_TOKEN=<twilio auth token>
TWILIO_VERIFY_SERVICE_SID=<twilio verify service sid>
```

## Vercel workflow

Recommended setup:

1. Create a dedicated Vercel project for staging.
2. Point that project at the integration branch named `staging`.
3. Configure automatic deployments for pushes to `staging`.
4. Add the GitHub workflow in `.github/workflows/staging-readiness.yml` as a required status check before merges into `staging`.

This gives the team one stable staging URL while still allowing Vercel preview deployments for feature branches.

## Turso setup

Use a dedicated staging database and token. Do not reuse local SQLite or any future production database.

- `DATABASE_URL` should be the remote libSQL/Turso URL.
- `TURSO_AUTH_TOKEN` must be present in production-like environments.
- The runtime DB client now passes the auth token explicitly to libSQL.

## Twilio setup

Staging uses the real Twilio Verify flow.

- Create a staging Verify service or clearly scoped staging credentials.
- Confirm allowed phone numbers and test process with the team.
- Treat staging OTP and rate-limit behavior as part of smoke testing.

## Synthetic staging data

The staging seed script is intentionally destructive and guarded.

```bash
STAGING_SEED_CONFIRM=skybo-staging \
APP_ENV=production \
DATABASE_URL=libsql://<your-staging-db>.turso.io \
TURSO_AUTH_TOKEN=<turso-auth-token> \
SESSION_SECRET=<32+ char random secret> \
TWILIO_ACCOUNT_SID=<sid> \
TWILIO_AUTH_TOKEN=<token> \
TWILIO_VERIFY_SERVICE_SID=<service> \
npm run db:seed:staging
```

Guardrails:

- refuses to run unless `APP_ENV=production`
- refuses to run against `file:` SQLite URLs
- requires explicit confirmation via `STAGING_SEED_CONFIRM=skybo-staging`

## Readiness gate

Before merging into `staging`, the following must pass:

```bash
npm run staging:ready
```

That runs:

- `npm test`
- `npm run build`

## Smoke checklist

Run these after each staging deploy:

1. Request OTP from `/login`.
2. Verify OTP and confirm dashboard redirect.
3. Confirm the `app_session` cookie grants protected-route access.
4. Log out and confirm the session is cleared.
5. Load one DB-backed screen such as dashboard, friends, or profile.
6. Verify no dev-only auto-login or dev seed behavior is exposed.
7. If secrets changed, confirm a fresh deployment recovers cleanly.
