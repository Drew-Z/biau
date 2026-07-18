# Frontend State Management

## Current State Model

The site intentionally uses React component state, route-derived state, small browser persistence, and typed static data. Do not add a global state library unless multiple distant consumers genuinely need shared mutable state.

## Top-Level UI State

`App.tsx` owns:

- Language: `zh | en`.
- Theme: `light | dark | auto`.
- Harbor scene: `dusk | garden | stellar`.
- Route-derived page class and public-assistant visibility.

Persist only stable visitor preferences. Effects that touch browser APIs must clean up listeners/timers and tolerate SSR/test environments.

## Route-Derived State

- Use React Router params/location as the source of truth for project/blog/status/Studio detail routes.
- Do not duplicate the active route in component state.
- SEO and analytics consume normalized route patterns, never full query strings or dynamic private ids.
- `/operator` and `/operator/settings` are private owner routes; old private routes resolve to NotFound without redirects.

## Typed Public Data

- Project data: `src/data/portfolio.ts`.
- Blog catalog/curation: `src/data/blog.ts` and `src/data/blog-posts/*`.
- Status targets/view projection: `src/data/statusTargets.ts` and `src/data/siteStatusView.ts`.
- Public assistant knowledge: `src/data/assistant.ts` and generated server indexes.
- BIAU Operator browser contract: `src/data/operator.ts`.

Pages consume typed projections. If two consumers derive the same summary/tags/status, keep one shared projection helper.

## Scenario: BIAU Operator Browser State

### State

`/operator` owns:

- `operator` profile returned by `/api/operator/me`.
- Session previews and selected session id.
- Normalized messages and latest answer meta.
- Composer input and send/loading/error state.
- Mobile session drawer open state.

`/operator/settings` owns:

- Active settings section: overview, knowledge, RAG, memory, usage.
- One normalized settings snapshot.
- Local knowledge editor form state.
- Save/sync/loading/error state.

### Contracts

- Browser requests always use same-origin `/api/operator/*` and `credentials: same-origin`.
- No member token, invite code, admin token, Render service token, owner email, or Access JWT is stored in local/session storage.
- `src/data/operator.ts` owns all Operator payload decoding and safe error messages.
- Shared assistant metadata/knowledge decoders may be reused from `src/data/assistant.ts`; route components must not cast raw JSON.
- Switching sessions replaces messages and derived meta together so diagnostics do not bleed across sessions.
- Session/message requests use a monotonically increasing request id (or equivalent cancellation guard); only the latest selected session may update loading, error, messages, and derived meta.
- A chat response that finishes after the owner switches sessions may refresh the session list, but it must not select the old session or append its answer to the current conversation.
- Failed bootstrap leaves a clear reconnect/configuration message; it must not fall back to a fake owner identity.
- Suggestions fill the composer; they do not auto-run a task without the user's send command.
- Studio artifacts render only bounded safe fields and same-site `/studio?draft=<id>` links.

### Mobile Drawer

- Desktop sidebar is static.
- Mobile drawer starts closed, opens from a 44px icon button, stays inside the viewport, has a backdrop and explicit close action, and does not cause horizontal overflow.
- Drawer state is UI-only and resets naturally on navigation/unmount.

### Validation

```powershell
npm.cmd run operator:facade-smoke
npm.cmd run assistant:meta-check
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```

## Scenario: Public Assistant State

- The public widget is available on public routes and hidden on `/operator*` and `/studio*`.
- Initial open state contains no default transcript/citation dump.
- Public suggestions and messages use sanitized public knowledge.
- Missing model/API displays a concise fallback status; it does not expose provider details.
- Public widget state is independent from Operator sessions and Studio tokens.

## Scenario: Content Studio State

- Studio token remains an explicit editor credential and may be stored only in the documented Studio browser key.
- Draft/source/issue/review/export payloads are normalized before rendering.
- Query `?draft=<id-or-slug>` selects a draft after authenticated data loads.
- AI Daily source selection is an ordered, deduplicated id list derived from loaded source items.
- `/studio/ai-daily` keeps `view` and `issueId` in the URL query; changing an Edition explicitly loads that issue rather than relying on callback identity changes.
- AI Daily workspace responses always pass through `normalizeStudioAiDailyWorkspace`; a request sequence fence prevents an older response from replacing a newer selection.
- Flash writes use the displayed `publicRevision` and revision number as optimistic tokens; after a successful mutation the workspace is refreshed before another action can reuse them. A `409` keeps the loaded data and asks the editor to refresh rather than guessing.
- Edition writes use the displayed issue timestamp, revision number, and draft timestamp. Correction keeps one stable idempotency key across retries, appends a new revision, and closes its form only after success. Discard requires a visible reason that is sent to the audit path.
- Local UI fixtures may simulate Candidate, Flash, and Edition transitions for deterministic checks, but production actions always go through the authenticated Studio API and never expose the token in status text.
- Save/review/export actions update the canonical loaded record, then refresh dependent summaries.
- Hidden/review-needed drafts never enter public blog state automatically.

## Scenario: Project Detail Projection

- `detailContent` remains the source for implementation, workflow, architecture, quality, limits, and roadmap sections.
- Assistant project summaries/tags are derived through shared helpers so project pages and public knowledge do not drift.
- Visuals use stable ids, bounded aspect ratios, explicit alt/caption/source fields, and public-safe assets.
- Missing or invalid project ids render a stable NotFound/detail-missing state.

## Scenario: Public Blog Curation

- Public visibility is controlled by curation, not by draft-file existence.
- Hidden/review-needed drafts do not enter list/detail/assistant/sitemap.
- Column, search, pagination, and empty state are derived from one filtered public collection.
- Changing column/search resets pagination to page one.

## Mobile State Rules

- Touch gestures have one owner; page vertical scroll must not compete with nested horizontal/vertical gesture state.
- Mobile primary navigation contains only public sections: home, projects, blog/knowledge, status.
- Detail reading guides, public assistant, and bottom navigation coordinate offsets without overlapping final content.
- Reduced-motion state keeps a stable background frame while normal mode may animate.

## Avoid

- Duplicating route, server payload, or derived catalog state.
- Storing server credentials or owner identity in browser storage.
- Casting `unknown` API payloads inside components.
- Auto-running model/provider diagnostics from effects.
- Coupling Chatus or Learn state into this repository.
