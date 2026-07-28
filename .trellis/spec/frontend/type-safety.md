# Frontend Type Safety

## TypeScript Baseline

The frontend is TypeScript-first. `npm run build` runs `tsc -b` before `vite build`, so type errors must be fixed before a task is considered complete.

## Type Organization

Keep domain types next to the data they describe. `src/data/portfolio.ts` defines `ProjectCategory`, `ProjectStatus`, `ProjectLink`, and `Project` before exporting `projects`. Components import those types with `import type`, as `ProjectCard` does.

Local UI-only types can stay inside the component or hook module. `SiteLanguage` and `HarborScene` are currently defined near the app/layout logic that uses them.

Shared API payload types belong in dedicated modules. The assistant server uses `server/src/types.ts` for chat and knowledge shapes; frontend code should mirror or import shared contracts deliberately rather than casting arbitrary payloads.

## Literal Unions and Records

Use literal unions plus `Record<Union, Value>` for labels, statuses, and category mappings. References:

- `categoryLabels` and `statusLabels` in `src/data/portfolio.ts`.
- `categoryAccent: Record<Project['category'], string>` in `src/components/ProjectCard.tsx`.

This keeps additions to categories/statuses visible at compile time.

## Runtime Checks

For browser storage, validate strings before accepting them. `readHarborScene()` and `readStoredMode()` only return known literal values and otherwise fall back to defaults.

There is no runtime validation library in the frontend. Do not add one unless the feature has a clear boundary with untrusted external payloads.

## Public Assistant Conversation Contracts

- Generation intent, Branch action, history projection, and Revision result are discriminated unions. Branch, Turn, Revision, Request, and Session identifiers remain opaque strings rather than client-derived structures.
- JSON answers, terminal SSE results, Session history, and Branch responses pass through shared normalizers/decoders before components or reducers consume them. Components do not cast `unknown` payload fields.
- A logical conversation Turn explicitly carries its `selectedRevisionId` and `revisions[]`. Each Revision keeps answer, citations, claims, suggestions, metadata, feedback, and recovery identity in one coherent snapshot; do not split these into parallel arrays that can drift.
- A legacy response without conversation identity may render as an ephemeral answer, but the decoder must not fabricate Branch, Turn, or Revision capabilities.

## Avoid

- Avoid `any`; use explicit interfaces, discriminated unions, or `unknown` with narrowing.
- Avoid broad type assertions for API responses without checking required fields.
- Do not weaken types to make data additions faster; update the relevant union, labels, and display mappings together.
