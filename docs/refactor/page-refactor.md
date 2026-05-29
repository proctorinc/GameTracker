# Page Refactor Guide

## Goal

Refactor large page implementations into a consistent route-local structure where:

- The route `page.tsx` stays the SSR boundary.
- Server-loaded page data is assembled in one dedicated `page-data.ts` file.
- A page-scoped client provider exposes the SSR snapshot through a custom hook.
- Large page UI is split into smaller route-local sections, controls, and dialogs.
- Shared UI and generic helpers stay global only when they are genuinely reused across pages.

The result should make it easy to:

- Access page data from any child component without prop drilling.
- Break pages into smaller files without losing cohesion.
- Keep server concerns, client state, and presentational components clearly separated.
- Standardize page structure so future pages look and behave the same way.

## Target Structure

For a route like `src/app/(protected)/friends/page.tsx`, the end state should usually look like this:

```text
src/app/(protected)/friends/
  page.tsx
  _components/
    page-data.ts
    utils.ts
    friends-page.tsx
    friends-page-provider.tsx
    sections/
      ...
    controls/
      ...
    dialogs/
      ...
```

For simpler pages, `controls/` or `dialogs/` may not be needed. For more complex pages, add `types.ts` when the page data contract deserves its own file.

## What Lives Where

### `page.tsx`

Responsibilities:

- Read `searchParams`, `params`, and request headers.
- Load the page data with one page-specific server function.
- Pass the data and any request-derived values into the client page boundary.

Do not:

- Put large JSX trees here.
- Put client state here.
- Fetch data in several unrelated places when one page contract will do.

### `page-data.ts`

Responsibilities:

- Build the exact SSR data shape required for the page.
- Compose auth/session data, DB queries, and request-specific values into one page contract.
- Return the narrowest useful shape for the page instead of broad store types when possible.

Guideline:

- If `loadUser()` returns only a base user, keep that behavior intact and build any richer page data here through dedicated queries.

### `*-page-provider.tsx`

Responsibilities:

- Hold page-level client state.
- Wrap action handlers that need access to `router.refresh()`, `toast`, tabs, dialog state, optimistic state, or list expansion toggles.
- Expose a page-scoped hook like `useFriendsPage()` or `useProfileOverview()`.

Guideline:

- Put SSR snapshot data and page-wide client orchestration here.
- Do not move every local form field into the provider if it is only used in one child component.

### `*-page.tsx`

Responsibilities:

- Act as the top-level client composition file.
- Render the provider and the main page content.
- Choose which sections appear for the current page state.

### `sections/`

Use this for page regions such as:

- Headers
- Summary cards
- Tab content
- Lists
- Panels

These files should usually read from the page hook and stay mostly presentational.

### `controls/`

Use this for smaller interactive units embedded inside sections, such as:

- Inline forms
- Filter controls
- Small action panels

### `dialogs/`

Use this for modal content that would otherwise bloat the main page file.

### `utils.ts`

Keep page-local helpers here when they are only relevant to this page, such as:

- Display formatting
- Tab keys
- Page-specific derived labels
- Small local types

Move helpers to global shared locations only when they are clearly reused or clearly reusable across multiple pages.

## Recommended Workflow

### 1. Inspect the current page boundary

Start by reading:

- The route `page.tsx`
- The main client component currently used by that route
- Any server actions or page-data loaders it already depends on
- Any request-derived inputs such as `searchParams`, `params`, or `headers()`

Questions to answer:

- What data is SSR-loaded today?
- What data should belong to one page contract?
- What state is page-wide versus local to one form or dialog?
- What are the natural section boundaries in the UI?

### 2. Identify the page contract

Before moving files around, define the data shape the page actually needs.

Examples:

- Profile overview needed a focused user shape.
- Friends needed the full `FriendsPageData` plus request-derived values like `inviteBaseUrl` and `showInviteNotice`.

Guidelines:

- Prefer one page-specific loader over several unrelated fetches spread through the tree.
- Prefer explicit page types over `as any`.
- Prefer narrow page contracts over broad DB entity types when the page does not use everything.

### 3. Create route-local `page-data.ts`

Add a file under the page folder such as:

- `src/app/(protected)/profile/_components/overview/page-data.ts`
- `src/app/(protected)/friends/_components/page-data.ts`

This file should:

- Be server-only when appropriate.
- Export a single clear function like `getProfileOverviewPageData()` or `getFriendsOverviewPageData()`.
- Return a typed page contract.

### 4. Keep `page.tsx` thin

Update the route file so it:

- Loads the page data
- Reads headers/search params if needed
- Passes everything into a client page boundary

The route file should become simple enough to scan quickly.

### 5. Introduce a page-scoped provider and hook

Create a provider file such as:

- `profile-overview-provider.tsx`
- `friends-page-provider.tsx`

It should expose a hook like:

- `useProfileOverview()`
- `useFriendsPage()`

Put in the provider:

- Page-level UI state
- Shared action handlers
- Derived page-wide values
- Any light optimistic state for the page

Keep out of the provider:

- Large JSX trees
- Pure formatting helpers
- Form-only state that is isolated to a single small component unless it genuinely needs to be shared

### 6. Split the UI into route-local parts

Break the original large client file into small focused files.

Good first cuts:

- Header section
- Tabs or top-level navigation
- Primary lists/cards
- Secondary panels
- Dialogs
- Inline forms

A useful rule:

- If a block of JSX has its own heading, card, or modal, it is often a good candidate for its own file.

### 7. Decide what stays global

As you split the page, identify what should remain shared.

Good global candidates:

- Reused UI components already used on multiple pages
- Generic display helpers used by several features
- Small profile/avatar components used across the app

Keep page-local when:

- The helper is tightly coupled to one page’s labels or domain language
- The component is only used by that route
- Extracting globally would create a vague or misleading shared abstraction

Important:

- Do not force global extraction just because something is technically reusable.
- Default to route-local first, then promote shared pieces once repetition is real.

### 8. Remove the old monolith

Once the route-local page is wired up and verified:

- Delete the old large client file if it is no longer used.
- Update imports so the route points only to the new structure.

This prevents two parallel structures from lingering in the codebase.

### 9. Verify the refactor

At minimum, run:

- Targeted ESLint for the touched route files
- TypeScript for the repo if practical

When full repo TypeScript fails for unrelated reasons:

- Confirm the route-local refactor passes its own lint checks
- Note the existing unrelated failures clearly

## Naming Conventions

Use clear, route-specific names.

Prefer:

- `getFriendsOverviewPageData`
- `FriendsPageProvider`
- `useFriendsPage`
- `FriendsPageView`
- `InviteNotices`
- `RemoveFriendDialog`

Avoid:

- Generic names like `PageProvider`, `usePage`, or `SectionOne`
- Global names for route-local files unless they are truly shared

## State Placement Rules

Use these rules consistently:

### Put in SSR page data

- Data fetched from auth/session, DB, or request context
- Data needed by multiple child components on first render
- Page-level booleans derived from request state

### Put in the provider

- Active tab
- Dialog open/close state
- Page-wide loading state
- Shared action handlers
- Shared derived collections used by multiple sections

### Put in a local child component

- Form input state used only by one form
- Temporary local UI state that does not affect siblings
- Small interaction details that do not need to be shared

## Lessons From Completed Refactors

### Profile overview

Useful decisions:

- The route became a thin SSR entry.
- The page data contract was narrowed to what the overview actually needed.
- The page was split into hero, details, admin card, and smaller controls.

Watch for:

- Avoiding broad user types when the page only needs a subset.
- Avoiding effect-driven provider sync when a keyed remount is simpler.

### Friends page

Useful decisions:

- The provider became the home for page-wide actions, tab state, dialog state, and list toggles.
- Sections handled rendering while the provider handled orchestration.
- Dialogs were moved out of the main page file into dedicated route-local files.

Watch for:

- Keeping action-heavy pages readable by centralizing orchestration without centralizing every tiny input field.
- Keeping page-local helpers local unless there is clear reuse.

## Consistency Checklist

Use this checklist during future refactors:

- Is `page.tsx` now a thin SSR entry?
- Does the page have a dedicated `page-data.ts` contract?
- Is there a page-scoped provider and custom hook?
- Are large UI regions split into route-local sections?
- Are dialogs split into route-local dialog files?
- Are page-specific helpers kept local unless truly shared?
- Did we avoid `as any` and broad implicit data contracts?
- Did we remove the old monolithic page client file?
- Did we run targeted verification?
- Did we document any unrelated existing build or type failures separately?

## Default Refactor Order

When doing this on a new page, use this order:

1. Read the route and current client component.
2. Define the SSR page data contract.
3. Add `page-data.ts`.
4. Add the page provider and hook.
5. Add the new route-local client page file.
6. Split the largest sections first.
7. Split dialogs and forms next.
8. Remove the old client file.
9. Run verification.
10. Note any shared helper candidates, but only move them if the value is clear.

## Shared Helper Heuristics

A helper or component is a good shared candidate when:

- It already has multiple callers.
- Its name can stay precise outside the current page.
- Its behavior is not coupled to one page’s terminology.
- Moving it reduces real duplication instead of speculative duplication.

Examples of likely shared candidates:

- User display-name helpers
- Small date-label formatting used by multiple activity lists
- Reused avatar/profile display components

Examples of likely page-local helpers:

- Tab keys for one page
- Page-specific notice text builders
- Page-specific “show all” label logic

## Final Principle

Optimize for a page structure that is easy to scan and easy to extend.

The goal is not to maximize abstraction. The goal is to make each page predictable:

- one SSR entry,
- one page data contract,
- one page hook,
- many small local files,
- shared pieces only when they are truly shared.
