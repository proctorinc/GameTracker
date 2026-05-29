# Backend Testing Plan

## Goals
- Verify database-backed behavior against a real SQLite database instead of broad mocks.
- Keep pure business logic fast with small unit tests.
- Cover the contract edges for API routes, auth/session handling, and server actions.
- Make it easy to add deterministic fixtures for new stores and flows.

## Testing Layers

### Pure unit tests
- Use `Vitest` in `node` for stateless helpers and transformation logic.
- Current focus areas:
  - auth path helpers
  - phone normalization
  - env validation
  - referral tree shaping
  - title default normalization

### Real DB integration tests
- Use `Vitest` with the isolated SQLite helper in `tests/helpers/test-db.ts`.
- Every integration test gets a fresh migrated database.
- Use these tests for:
  - Drizzle stores
  - API routes that hit persistence
  - server actions that depend on auth, sessions, or DB side effects

### End-to-end verification
- Let `Playwright` prove that route handlers, server actions, cookies, and pages work together in the running app.
- Keep those tests focused on user workflows rather than internal query details.

## File Placement
- Pure units stay colocated in `src/**`.
- Cross-cutting integration tests live in:
  - `tests/integration/db/`
  - `tests/integration/api/`
  - `tests/integration/actions/`
- Reusable fixture factories live in `tests/fixtures/`.

## Libraries and Config
- Unit runner: `vitest.unit.config.ts`
- Integration runner: `vitest.integration.config.ts`
- Shared setup: `vitest.setup.shared.ts`
- Real DB helper: `tests/helpers/test-db.ts`
- Deterministic fixtures:
  - `tests/fixtures/users.ts`
  - `tests/fixtures/auth.ts`
  - `tests/fixtures/games.ts`
  - `tests/fixtures/invitations.ts`

## Commands
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:coverage`
- `npm run test:ci`

## Step-By-Step Implementation
1. Start with a fresh integration test under `tests/integration/` for any store, route, or action that persists data.
2. Wrap the test in `withTestDatabase(...)` from `tests/helpers/test-db.ts`.
3. Build the minimum data needed with the fixture factories in `tests/fixtures/`.
4. Import the store, route, or action after the test database is prepared so the DB singleton binds to the isolated file.
5. Mock only framework boundaries or external providers:
  - `next/headers`
  - `next/cache`
  - Twilio provider resolution
6. Assert both the return value and the persisted database state.
7. Prefer one behavioral assertion path per test:
  - create
  - update
  - unauthorized
  - invalid input
  - cleanup
8. Run `npm run test:integration` before relying on browser tests to catch backend regressions.

## Current Real-DB Coverage
- Session store lifecycle in `tests/integration/db/session.store.test.ts`
- Auth routes in `tests/integration/api/auth-routes.test.ts`
- Server actions in `tests/integration/actions/server-actions.test.ts`

## Coverage Expectations
- Global threshold target:
  - `70%` lines
  - `70%` statements
  - `70%` functions
  - `60%` branches
- Add new integration coverage whenever an action or route introduces auth, session, or persistence behavior.

## Immediate Expansion Areas
- Invitation acceptance, decline, revoke, and merge flows.
- Game round commit and winner calculation flows.
- User profile actions and protected page data loaders.
- Additional route coverage for failure paths and unauthorized requests.
