# Frontend Type Safety

## TypeScript Baseline

The frontend is TypeScript-first. `npm run build` runs `tsc -b` before `vite build`, so type errors must be fixed before a task is considered complete.

## Type Organization

Keep domain types next to the data they describe. `src/data/portfolio.ts` defines `ProjectCategory`, `ProjectStatus`, `ProjectLink`, and `Project` before exporting `projects`. Components import those types with `import type`, as `ProjectCard` does.

Local UI-only types can stay inside the component or hook module. `SiteLanguage`
may stay near the app/layout logic that uses it; the shared appearance union is
`SiteTheme` from `src/utils/appearance.ts`.

Shared API payload types belong in dedicated modules. The assistant server uses `server/src/types.ts` for chat and knowledge shapes; frontend code should mirror or import shared contracts deliberately rather than casting arbitrary payloads.

## Literal Unions and Records

Use literal unions plus `Record<Union, Value>` for labels, statuses, and category mappings. References:

- `categoryLabels` and `statusLabels` in `src/data/portfolio.ts`.
- `categoryAccent: Record<Project['category'], string>` in `src/components/ProjectCard.tsx`.

This keeps additions to categories/statuses visible at compile time.

## Runtime Checks

For browser storage, validate strings before accepting them. `isSiteTheme()`
guards `morning | nature | stellar`; `readStoredSiteTheme()` applies the
documented legacy mappings and otherwise returns Morning. Do not let components
accept raw local-storage strings or introduce a second appearance union.

There is no runtime validation library in the frontend. Do not add one unless the feature has a clear boundary with untrusted external payloads.

## Public Route References

### Scope / Trigger

Browser path segments can contain malformed percent encoding. Auxiliary UI such as assistant suggestions must preserve ordinary missing-page recovery, including when a previously mounted widget is closed. Product IDs and reliability project IDs are separate contracts (`pet-workspace` versus `pet-gamer`).

### Signatures

- `getPublicAssistantSuggestions(pathname: string): AssistantSuggestion[]` receives the router pathname, without query or hash.
- `npm.cmd run public-routes:ui` runs `tsx scripts/check-public-route-recovery-ui.mjs`; `check:ui` also runs the exported `checkPublicRouteRecovery(browser, base)` group.

### Contracts

- Decode a blog/project detail segment once at a narrow boundary. On decode failure use the existing three unknown-detail suggestions; preserve the URL and ordinary route matching.
- A publication's `statusHref` is `/status` or an exact member of the paths built from `reliabilityProjects`.
- The browser command accepts `UI_CHECK_BASE` (local preview origin; default `http://127.0.0.1:5174`) and optional existing `UI_CHECK_ARTIFACT_DIR`. Its result reports `matrixGroups`, `encodedGroups`, `statusGroups`, and `modelCalls`.
- Browser fixtures allow only the target origin, replace `/api/**` with local 503 responses, and assert that API traffic is limited to GET `/api/health`. No live model request is allowed.

### Validation & Error Matrix

| Input / state | Required behavior |
| --- | --- |
| Known plain or once-encoded detail, optional trailing slash | Three detail-specific suggestions |
| Unknown ID, double encoding, encoded separator, malformed percent or UTF-8 | Three default suggestions; no URIError |
| Mounted assistant open or closed on a missing detail | Navigation, missing heading, return action and history remain usable |
| Publication status reference outside the actual route set | `project-registry:check` fails |

### Good / Base / Bad Cases

`/blog/%6cegal-rag-review/` and `/blog/legal-rag-review` select the same article suggestions. `/blog/%` falls back without throwing. `/projects/%256cegal-rag` must not be decoded a second time into a known project.

### Tests Required

`assistant:kg-check` covers suggestion selection and generated-knowledge freshness; `project-registry:check` validates real status paths. `public-routes:ui` covers four widths, three themes, both widget states and detail families, valid encoded details, and every publication status reference. Wait for the detail's level-1 heading: the catalog card already contains the same title in an h3 before navigation commits.

### Wrong vs Correct

Wrong: call `decodeURIComponent` unguarded during render, repeatedly decode until a known ID appears, or validate a status link only with `startsWith('/status')`. Correct: catch only the native decode call at the segment boundary, use ordinary unknown-detail fallback, and validate status-path membership in the actual reliability set.

## Public Assistant Conversation Contracts

- Generation intent, Branch action, history projection, and Revision result are discriminated unions. Branch, Turn, Revision, Request, and Session identifiers remain opaque strings rather than client-derived structures.
- JSON answers, terminal SSE results, Session history, and Branch responses pass through shared normalizers/decoders before components or reducers consume them. Components do not cast `unknown` payload fields.
- A logical conversation Turn explicitly carries its `selectedRevisionId` and `revisions[]`. Each Revision keeps answer, citations, claims, suggestions, metadata, feedback, and recovery identity in one coherent snapshot; do not split these into parallel arrays that can drift.
- Recovery identity is optional typed metadata: `state: none | recovered | degraded`, `attempts: 1 | 2 | 3`, and an optional safe `failureClass`. Missing fields remain valid for older snapshots; unknown states, attempts, or failure classes are discarded at the decoder boundary.
- Components format normalized recovery values only. They must not cast or reinterpret raw API or stored snapshot fields.
- A legacy response without conversation identity may render as an ephemeral answer, but the decoder must not fabricate Branch, Turn, or Revision capabilities.

## Avoid

- Avoid `any`; use explicit interfaces, discriminated unions, or `unknown` with narrowing.
- Avoid broad type assertions for API responses without checking required fields.
- Do not weaken types to make data additions faster; update the relevant union, labels, and display mappings together.
