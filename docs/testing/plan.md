# Testing Strategy for Skybo

## Summary
- Keep `Vitest` as the core runner, but split testing into three layers: fast unit tests, DB-backed integration tests, and browser E2E tests.
- Add `React Testing Library`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` for interactive client-component coverage.
- Add `Playwright` for browser coverage, with a tiered suite: PR smoke tests on desktop Chromium plus mobile emulation for key flows, and a broader app sweep on main/nightly.
- Use a real isolated SQLite test database for backend integration tests, driven by migrations and deterministic fixtures instead of mocks.
- Document the finalized strategy in [frontend.md](/Users/mattyp/Documents/Projects/skyjo-2/docs/testing/frontend.md) and [backend.md](/Users/mattyp/Documents/Projects/skyjo-2/docs/testing/backend.md).

## Implementation Changes
- Stabilize the current harness first:
  - Fix the failing env test by aligning production test fixtures with the actual required env contract, including `TURSO_AUTH_TOKEN`.
  - Fix DB-dependent auth tests by separating mocked unit tests from real DB integration tests instead of relying on partial module mocks.
- Restructure Vitest into clear projects or equivalent script-level separation:
  - `node` environment for pure units and server-side integration.
  - `jsdom` environment for client-component tests.
- Add test scripts:
  - `test:unit`
  - `test:component`
  - `test:integration`
  - `test:e2e`
  - `test:ci` to run the PR gate sequence
- Add shared test support:
  - `tests/helpers/test-db.ts` for creating an isolated SQLite DB, running migrations, truncating/resetting data, and seeding deterministic records.
  - `tests/fixtures/` for reusable users, games, invitations, and auth states.
  - `tests/e2e/` for Playwright specs and seed-aware helpers.
- Keep colocated tests for source-adjacent coverage:
  - `*.test.ts` beside pure libs, stores, actions, and server-side page-data modules.
  - `*.test.tsx` beside interactive client components and providers.
- Use top-level integration and E2E folders for cross-cutting flows:
  - `tests/integration/api/`
  - `tests/integration/actions/`
  - `tests/integration/db/`
  - `tests/e2e/`
- Frontend testing approach:
  - Use RTL for stateful client components such as `login-form`, friends-page provider/dialog flows, game creation steps, and profile controls.
  - Mock `next/navigation`, `sonner`, clipboard, and imported server actions in component tests.
  - Use `MSW` only where a component truly talks over HTTP, such as auth fetch flows; do not force HTTP mocking onto server-action-driven components.
  - Add Playwright coverage for auth, dashboard, friends/invitations, gameplay, profile, and admin smoke flows.
- Backend testing approach:
  - Keep pure unit coverage for helpers in `src/lib/auth`, `src/lib/game`, `src/lib/dashboard`, and env utilities.
  - Add real DB integration tests for Drizzle stores, server actions in `src/app/actions`, and DB-touching API routes.
  - Prefer direct integration tests for server actions and route handlers, then rely on Playwright to prove end-to-end wiring.
- Add coverage thresholds immediately at a moderate level:
  - Global minimums: `70%` lines, `70%` statements, `70%` functions, `60%` branches.
  - Enforce thresholds in CI after the new suite is green locally.
- Add Playwright CI behavior:
  - PRs: unit + component + DB integration + a small Playwright smoke subset on desktop Chromium, with mobile-emulated smoke for key responsive flows.
  - Main/nightly: full Playwright browser sweep for the broader app surface.

## Test Plan
- Unit tests:
  - Phone normalization, return-path logic, post-login routing, title-default transforms, referral-tree shaping, score/winner logic, and env validation.
- Component tests:
  - `login-form` success and failure states, redirect behavior, and error messaging.
  - Friends page provider actions, tab switching, dialog state, invite/remove flows, and recent-player interactions.
  - Game creation UI state transitions and settings validation messaging.
  - Profile controls and dashboard sections that depend on user-facing conditional rendering.
- DB integration tests:
  - Store CRUD and query behavior for users, sessions, invitations, friendships, game titles, games, players, and rounds.
  - Server actions for friend invites, acceptance/decline/revoke, game creation, score updates, round commits, and title management.
  - API routes for auth request/verify/logout/me and dashboard group data.
- E2E smoke on PRs:
  - Sign in with deterministic seeded user.
  - Load dashboard successfully.
  - Create a friend invitation.
  - Create a game.
  - Complete a basic profile interaction.
- E2E full suite on main/nightly:
  - Accept and decline invitations.
  - Play through at least one round and verify score persistence/history.
  - View profile/public profile behavior.
  - Exercise admin title-management smoke paths.
  - Re-run the highest-value flows under mobile emulation.

## Important Interfaces And Artifacts
- New dev dependencies:
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
  - `jsdom`
  - `@playwright/test`
  - `msw` as an optional targeted helper
- New internal test helpers:
  - `tests/helpers/test-db.ts`
  - `tests/helpers/render.tsx` for RTL wrappers/providers
  - `tests/fixtures/*`
- New documentation deliverables:
  - `docs/testing/frontend.md` with frontend goals, test taxonomy, placement rules, libraries, commands, and step-by-step rollout.
  - `docs/testing/backend.md` with backend goals, DB strategy, route/action/store coverage, fixtures, migration flow, and CI usage.

## Assumptions And Defaults
- We will optimize for a hybrid frontend stack, real DB-backed backend integration, broad app E2E coverage, a tiered CI gate, desktop Chromium by default, and mobile smoke coverage for key flows.
- Browser cross-matrix coverage beyond Chromium mobile emulation is out of the first rollout unless a specific production bug demands WebKit or Firefox.
- A deterministic test seed will be added for integration and E2E work; we will not rely on the large development seed as the long-term test fixture source.
- Before auth E2E is finalized, the hard-coded `IS_DEV = true` login behavior in [login-form.tsx](/Users/mattyp/Documents/Projects/skyjo-2/src/app/login/login-form.tsx) should be replaced with a real environment-driven branch so tests cover the intended auth experience cleanly.
