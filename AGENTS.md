# Score Loser Agent Guide

## Application Purpose

Score Loser is a Next.js 16 application for managing social game activity. The app includes authentication, protected user areas, friend and invite flows, game and card features, player rankings, admin tools, and a Drizzle-backed database layer.

Agents should treat this as an active product codebase, not a starter template.

## Primary Structure

- `src/app/` - Next.js App Router routes, layouts, API routes, server actions, and page-level UI
- `src/app/(protected)/` - Authenticated product areas such as dashboard, activity, friends, games, profile, titles, and admin
- `src/app/_components/` - App-specific shared page components
- `src/components/` - Feature components grouped by domain
- `src/components/ui/` - Shared shadcn/ui primitives
- `src/lib/` - Shared utilities, services, auth helpers, and domain logic
- `src/lib/db/` - Drizzle database entrypoints, schema, migrations, and data stores
- `src/lib/db/store/` - Data-access modules for users, games, invitations, cards, rankings, and admin features
- `src/lib/dev/` - Development-only helpers such as demo seed behavior
- `src/types/` - Shared TypeScript types
- `scripts/` - Development, seed, repair, and maintenance scripts
- `tests/` - End-to-end coverage and broader test support
- `data/` - Local SQLite databases and other development data artifacts
- `docs/` - Project-specific operational and implementation documentation

## Database Rules

- The canonical Drizzle schema lives in `src/lib/db/schema.ts`.
- Never manually create, edit, rename, delete, or otherwise touch files in `src/lib/db/migrations/`.
- Never manually modify Drizzle snapshot or journal files under `src/lib/db/migrations/meta/`.
- If the schema changes, update the schema file only, then ask the user to run `npm run db:generate` to generate migrations and `npm run db:migrate` to apply them.
- Do not hand-author SQL migration files for this project.

## Working Expectations for Agents

- Prefer making changes inside the existing `src/` structure instead of introducing parallel top-level app folders.
- Keep feature logic near its domain area when possible.
- Follow the existing App Router, TypeScript, Tailwind, Clerk, and Drizzle patterns already present in the repo.
- Treat `npm run dev` as the standard local workflow; it handles migration, seed behavior, and starts the app.
