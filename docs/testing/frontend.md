# Frontend Testing Plan

## Goals
- Catch regressions in interactive client components before they ship.
- Keep feedback fast for UI logic that does not need a browser.
- Cover the highest-value user journeys in a real browser, including mobile-sized layouts.
- Make test placement and tooling obvious so new UI work naturally ships with tests.

## Testing Layers

### Unit and view-model coverage
- Use `Vitest` for pure helpers and server-rendered view contracts.
- Keep these tests colocated beside the source as `*.test.ts` or `*.test.tsx`.
- Current examples:
  - `src/app/(protected)/dashboard/_components/dashboard-page.test.tsx`
  - `src/components/game/create-game-title-step.test.tsx`

### Component interaction coverage
- Use `Vitest` with `jsdom`, `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`.
- Focus on stateful client components:
  - `src/app/login/login-form.tsx`
  - friends dialogs/providers
  - game creation steps
  - profile editing controls
- Mock `next/navigation`, `sonner`, clipboard APIs, and imported server actions when the test is about UI behavior rather than backend wiring.

### Browser end-to-end coverage
- Use `Playwright` for cross-page user flows in `tests/e2e/`.
- Default projects:
  - desktop Chromium
  - mobile Chromium emulation (`Pixel 7`)
- PR smoke coverage should include:
  - sign in
  - dashboard load
  - friend invite by phone
  - create game
  - basic profile update

## File Placement
- Colocate component-focused tests with the component when the assertions are local to that file or feature.
- Put reusable helpers in `tests/helpers/`.
- Put Playwright helpers in `tests/e2e/helpers/`.
- Keep reusable seeded data and fixture builders in `tests/fixtures/`.

## Libraries and Config
- Component runner: `vitest.component.config.ts`
- Shared setup:
  - `vitest.setup.shared.ts`
  - `vitest.setup.component.ts`
- Rendering helper: `tests/helpers/render.tsx`
- Browser runner: `playwright.config.ts`

## Commands
- `npm run test:component`
- `npm run test:e2e`
- `npm run test:e2e:smoke`
- `npm run test:ci`

## Step-By-Step Implementation
1. Add or update the client component.
2. Add a colocated `*.test.tsx` file for the component state transitions, loading states, and validation errors.
3. Use `renderWithProviders` from `tests/helpers/render.tsx`.
4. Mock `next/navigation` and any server actions the component triggers.
5. Prefer accessible queries (`getByRole`, `getByLabelText`, `getByText`) and use `data-testid` only when the UI primitive makes that necessary.
6. If the flow spans routes or depends on browser-only behavior, add or extend a Playwright spec in `tests/e2e/`.
7. Tag PR-safe flows with `@smoke`.
8. Run `npm run test:component` locally before moving to Playwright.
9. Run `npm run test:e2e:smoke` for flows that affect auth, navigation, or cross-page state.

## Coverage Expectations
- Global threshold target:
  - `70%` lines
  - `70%` statements
  - `70%` functions
  - `60%` branches
- Prioritize meaningful behavior coverage over snapshot quantity.

## Immediate Expansion Areas
- Friends page provider and dialog interactions.
- Profile overview controls.
- Game settings step validation and error states.
- Admin title-management smoke coverage in Playwright.
