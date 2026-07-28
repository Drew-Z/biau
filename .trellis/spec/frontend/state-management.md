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

## Typed Public Data

- Project data: `src/data/portfolio.ts`.
- Blog catalog/curation: `src/data/blog.ts` and `src/data/blog-posts/*`.
- Status targets/view projection: `src/data/statusTargets.ts` and `src/data/siteStatusView.ts`.
- Public assistant knowledge: `src/data/assistant.ts` and generated server indexes.

Pages consume typed projections. If two consumers derive the same summary/tags/status, keep one shared projection helper.

## Scenario: Public Assistant State

- The public widget is available on public routes and hidden on `/studio*`.
- Initial open state contains no default transcript/citation dump.
- Public suggestions and messages use sanitized public knowledge.
- Missing model/API displays a concise fallback status; it does not expose provider details.
- The widget prefers the same-origin SSE route, derives one bounded progress label from validated event stages, and renders only the terminal verified result. It falls back to the JSON route only when the stream endpoint is explicitly unsupported; rate limits and transport/provider failures never replay the question.
- Public widget state is independent from Studio tokens and internal editing state.
- The conversation source of truth is typed logical Turns with immutable Revision snapshots, bounded Branch summaries, and one `activeBranchId`; do not rebuild it as a flat user/assistant message array.
- Pure projection/reducer helpers live outside the widget. Previewing a Revision changes only that Turn's viewed selection, while regeneration merges a new Revision without appending the same user question again.
- A local degraded answer may complete a pending new Turn, but it never becomes a synthetic Revision for a failed answer-regeneration intent. Keep the persisted active/viewed Revision and its navigation unchanged until a remote regeneration succeeds.
- Successful restore, Branch selection, and continue-from-revision replace the visible path atomically from the normalized server history. The browser never constructs persisted ancestry by joining local messages.
- Failed Branch selection and continue actions keep the current path, surface a retryable issue in the main conversation, and retain the exact bounded action for explicit retry. A synchronous pending fence prevents double-clicks from sending the action twice; only the authoritative success response hydrates a new path.
- Background health failures never replace a visible user-action issue carrying chat or Branch retry identity. Successful Branch completion clears only the Branch issue it owns, so late independent requests cannot erase another operation's recovery state.
- A completed replay triggers an authoritative Session-history refresh before the visible path changes. Older controllers, Session captures, frozen replay metadata, or failed history fetches must not move the current Branch head backward.
- A version-2 completion with `activated: false` belongs to a saved non-active Branch and must not enter the visible Turn list or prompt history. Fetch authoritative Session history just as for replay; if that refresh fails, keep the existing path, show a recovery notice, and disable follow-up until restore succeeds or the visitor starts a new conversation.

## Scenario: Public AI Daily Feed State

- Public Feed and detail responses pass through `src/utils/aiDailyPublicApi.ts`; route components do not cast `unknown` payloads or render unvalidated citation URLs.
- Starting a new Feed/detail request aborts the previous request. Route change and unmount abort the active request, and an intentional `AbortError` never becomes a visible network failure.
- A request sequence fence remains in place so a late response cannot overwrite a newer refresh, cursor page, or `publicId`.
- Feed refresh sends the current ETag, treats `304` as success, clears any transient error, and preserves the last successful payload. Cursor append does not send the Feed ETag and appends only the returned page.
- Transient refresh failure preserves the last successful payload and labels the failure. Visibility polling runs only while the document is visible and no more frequently than the configured 60-second interval.
- Detail route changes reset payload and ETag for the new `publicId`. A detail `304` preserves the loaded item and clears any previous error; `404` and `410` remain distinct user-facing terminal states.
- Loading, refreshing, stale, empty, error, correction, and pagination state must not discard readable approved content or create parallel requests.

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
