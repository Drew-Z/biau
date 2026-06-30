# Frontend State Management

## Current State Model

The frontend uses React local state, route state from `react-router-dom`, derived values with `useMemo`, and browser persistence through `localStorage`. There is no Redux, Zustand, MobX, React Query, or SWR in the project.

## Top-Level UI State

`src/App.tsx` owns cross-page UI state:

- `language`: toggles between `zh` and `en`, with simplified Chinese as the primary content language.
- `harborScene`: persisted under `biau-port-harbor-scene` and mirrored to `document.documentElement.dataset.harborScene`.
- theme mode: provided by `useTheme()`, persisted under `theme`, and applied through the `light-theme` root class.

Keep theme, language, and harbor scene controls consistent across pages. Do not introduce a second, disconnected source of truth for these states.

## Route and Derived State

Route-sensitive classes are derived in `getPageClass(pathname)` inside `src/App.tsx`. Add new route classes there when a new page family needs global styling.

Use `useMemo` for derived collections when the grouping logic is non-trivial and based on stable imported data. `src/pages/ProjectsPage.tsx` groups `projects` into AI, fullstack, and games sections this way.

## Data State

Public catalog and article data are static TypeScript exports in `src/data/`. Keep display data typed and sanitized. Runtime assistant conversations and admin state belong to the assistant API/frontend flow, not to global stores.

## When to Add a State Library

Do not add a state library for a single page or a small interaction. Consider one only if multiple distant route trees need frequent synchronized updates that are awkward with local state and props.

## Avoid

- Do not store secrets or private business data in frontend state or `src/data/`.
- Do not duplicate derived data arrays in multiple files; derive from `src/data/portfolio.ts` or shared data modules.
- Do not use `npm run dev` as validation for state changes; run lint/build because build catches TypeScript errors.
