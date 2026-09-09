# Frontend State Management

## Current State Model

The site intentionally uses React component state, route-derived state, small browser persistence, and typed static data. Do not add a global state library unless multiple distant consumers genuinely need shared mutable state.

## Top-Level UI State

`App.tsx` owns:

- Language: `zh | en`.
- Site theme: `morning | nature | stellar`.
- Route-derived page class and public-assistant visibility.

Persist only stable visitor preferences. Effects that touch browser APIs must clean up listeners/timers and tolerate SSR/test environments.

### Language Contract

- `src/utils/siteLanguage.ts` owns `SiteLanguage`, `biau-port-language`, and the
  `zh -> zh-CN` / `en -> en` document tags. Missing, invalid, or unreadable
  storage falls back to Chinese. A write failure must not block the active choice.
- App calls `useSiteLanguagePreference` once and supplies the read-only
  `SiteLanguageContext`. Route components use `useSiteLanguage`; do not create
  another preference state or remount routes when language changes.
- The preference is initialized lazily and projected to `html.lang` and storage
  in a layout effect. It survives navigation, history, refresh, and a new document
  in the same browser context without changing theme or discovery URL state.
- Translation is staged: navigation, footer, route loading, 404 and catalog
  interface controls follow the preference. `catalogCopy.ts` owns catalog UI
  labels and counts; `getBlogEmptyState` accepts an optional language defaulting
  to Chinese. Column options preserve both existing identities, with the active
  language first. App retains `lang="zh-CN"` as the fallback for remaining pages;
  localized catalog roots override it and mark authored card text Chinese.
  Publication-controlled card labels use the shared language projection described
  below; authored explanations retain their original text and language.
  Do not remount routes, reset discovery/input state, translate authored data,
  claim translated SEO/content or invent locale URLs during UI localization.
- Article and project detail controls also follow the shared preference through
  `detailCopy.ts`. Keep authored titles, body/sections, captions and image alt
  text Chinese; `ResponsiveImage` already forwards native `lang` attributes.
  Language changes must not become content-load or reading-reset dependencies.
  Fixed project section headings select the existing Chinese mapping or its
  English UI mapping in the page; Studio/export keep their original map.
  `getRelatedProjectsTitle(project, related, language = 'zh')` translates only
  the title, never recommendation ranking. Project category/status labels select
  the existing Chinese maps or their English UI maps without changing the source
  metadata used by assistant and export projections.
- Status overview/detail and their fixed section labels follow the same
  preference through `statusInterfaceCopy.ts`; see Status Interface Projection
  below for the boundary between UI labels and original status evidence.
- Public AI Daily feed/detail controls, errors and fixed reading labels use
  `aiDailyInterfaceCopy.ts`. Keep approved content and citation text unchanged;
  see Public AI Daily Interface Language for request and language boundaries.
- Existing UI fixtures must select a language from the actual current value;
  blindly toggling after `goto` now reverses a persisted choice. A refresh test
  must assert the retained language before making any corrective selection.

### Project Interface Projection

#### 1. Scope / Trigger

Shared project actions, candidate link labels, category/status labels, and the
homepage project panel follow the visitor preference. Translation must preserve
publication records, availability decisions, authored facts and navigation.

#### 2. Signatures

- `getProjectCta(publication, language: SiteLanguage = 'zh'): ProjectCtaProjection`
  returns `label`, `compactLabel`, `labelLanguage`, and optional
  `explanationLanguage` alongside the existing access/navigation fields.
- `getPublishedProjectLinks(publication, links, language: SiteLanguage = 'zh')`
  returns ordered `PublishedProjectLink[]` with independent label/explanation
  language metadata. `projectInterfaceCopy.ts` owns the fixed UI copy.

#### 3. Contracts

The selected language cannot change `mode`, `enabled`, `href`, `statusHref`, link
`type`/`intent`, candidate order, or the single fallback for unavailable entries.
`compactLabel` is explicit output; never derive action meaning from translated
substrings. Project-specific `unavailableReason` stays Chinese; generic access
explanations translate. Known candidate labels use exact Map lookups; unknown
labels remain authored text with the existing Chinese fallback.

Components apply language to the label text independently of an authored tooltip
or explanation. Keep a Chinese project title in its own text span where native
accessible-name composition permits it. UI category/status maps must not change
the source map; `live` means `Page exists`, not verified availability. Language
updates must not restart carousel, content-loading, or reading effects.

#### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Planned / unchecked / offline publication | Original status-only destination and authored reason |
| Case-only or missing external entry | Status-only destination with localized generic explanation |
| Degraded public / controlled entry | Same caution mode and destination; explicit Caution short label |
| Online public / controlled entry | Same direct destination; Open / Access short label |
| Multiple unavailable entry candidates | One status fallback; other evidence and order retained |
| Missing publication or unknown label | Candidate target preserved; unknown text remains unchanged |

#### 5. Good / Base / Bad Cases

Good: English `View current status` still opens the existing status route with
the original Chinese project-specific reason. Base: omitted language preserves
Chinese copy. Bad: translating a label enables a previously gated entry or
changes an unknown authored label through substring matching.

#### 6. Tests Required

`project-registry:check` covers CTA fixtures, real publications and candidate
sets, immutable inputs, default Chinese, exact-label fallback, and deduplication.
`checkProjectInterfaceLanguage` in `language:ui` verifies real browser content,
language markers, connected carousel DOM, links, keyboard actions and layout.
Mobile catalog status actions are visible; desktop retains its detail-only
layout and reaches status through the detail page. Assert visibility and focus
before Enter instead of trying to focus a hidden desktop button.

#### 7. Wrong vs Correct

Wrong: `cta.label.includes('受控')` or rewriting `projectPublications` to display
English. Correct: `getProjectCta(publication, language).compactLabel` and
`getPublishedProjectLinks(publication, links, language)` across every consumer.

### Status Interface Projection

#### 1. Scope / Trigger

Localize fixed status controls, explanations and section labels while preserving
published status data, authored project text and Studio/export defaults.

#### 2. Signatures

- `formatCheckedAt(value: string, language: SiteLanguage = 'zh')`
- `formatDuration(value: number, language: SiteLanguage = 'zh')`
- `formatHttpStatus(value: number, language: SiteLanguage = 'zh')`
- `statusInterfaceCopy[language]` projects fixed UI text; the static
  `statusOverviewSectionIds` and `statusDetailSectionIds` remain navigation ids.

#### 3. Contracts

Chinese maps remain the source for status tones, layer codes and default copy.
English overrides labels only. Do not mutate source records, reorder manual
tasks, change attention branches or translate evidence before parsing it.
`parseEvidenceFreshness` retains its Chinese label, original age text and
default-Chinese date projection. The UI formats its raw timestamp and maps its
four freshness labels without changing the evidence or inferring a new status.

Keep `dateStyle: 'medium'`, `timeStyle: 'medium'`, `hour12: false` and the existing
local timezone. Authored descriptions, check metadata, gates and next actions
stay Chinese. Raw errors of unknown language use `lang=""`; their fixed prefix
translates. Language changes must not restart `useSiteStatus`, remount pages,
recreate section scroll listeners or clear the reading outline.

#### 4. Validation & Error Matrix

| Input / state | Required result |
| --- | --- |
| Empty / invalid time | Localized Not generated / Unreadable time; Chinese by default |
| Missing duration or HTTP result | Localized Not recorded; existing numeric units and rounding retained |
| Four parsed freshness labels | Localized UI badge; original timestamp, age text and tone retained |
| Loading or failed JSON request | Static fallback stays readable; language causes no extra request |
| Language change at a section / outline | Stable ids, selection, focus and route history |

#### 5. Good / Base / Bad Cases

Good: format a parsed timestamp with the visitor language while retaining the
original Chinese evidence below it. Base: Studio omits the language and receives
the original Chinese formatter output. Bad: translating evidence before parsing
it, or making language a dependency of the status fetch effect.

#### 6. Tests Required

`status:contract` checks default/explicit locales, missing/invalid values,
numeric units, immutable maps/queue and four unchanged parsed evidence states.
`checkStatusInterfaceLanguage` in `language:ui` and full UI covers the page,
request, navigation, original-content and layout contracts.

#### 7. Wrong vs Correct

Wrong: write English strings into `statusMeta` or `check.evidence`.
Correct: render `statusInterfaceCopy[language].states[check.status]` and call
`formatCheckedAt(freshness.checkedAt, language)` only at the localized page.

### Appearance Contract

The site theme is one authoritative, persistent state:

```ts
type SiteTheme = 'morning' | 'nature' | 'stellar'
```

`src/utils/appearance.ts` owns `SiteTheme`, `biau-port-theme`, runtime
normalization, legacy migration, and root projection. Hooks and components
import this contract instead of redeclaring strings. `data-site-theme` and its
monotonic `data-site-theme-version` are the single authoritative DOM signals.
`light-theme` is a derived compatibility class for Morning/Nature only; it is
never stored or controlled independently.

The synchronous `index.html` prepaint mirrors the allowed values because an
imported module would run too late to prevent a wrong-theme first paint.
`biau-port-theme` wins when valid; otherwise migrate legacy
`biau-port-harbor-scene` as `dusk -> morning`, `garden -> nature`, and
`stellar -> stellar`, then the legacy `theme` key as `light -> morning`,
`dark -> stellar`, and `auto -> morning`. Invalid or unavailable storage falls
back to Morning without blocking rendering.

`useSiteTheme` commits root attributes, derived class, storage, and React state
synchronously, using a View Transition only when it is supported and reduced
motion is not requested. `scripts/check-ui.mjs` verifies exactly three themes,
direct/keyboard selection, refresh persistence, migration, and owner-version
agreement. A test fixture may seed `biau-port-theme` only when absent; it must
not overwrite the preference just before a reload assertion.

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

## Scenario: Catalog Reading Navigation

- `useReadingNavigation.ts` owns bounded, document-local reading records: at most 40 catalog entries and 40 detail positions, keyed by Router location key rather than URL alone. History state carries only an opaque origin key and an explicit return marker; positions never enter localStorage/sessionStorage or analytics.
- Discovery URL helpers remain authoritative for filters/groups and fixed return destinations. Same-family related details carry the origin key; cross-family links do not. Recheck the stored canonical catalog href before accepting an origin.
- Restore a catalog entry only for an explicit detail return or a POP directly from a detail. A later visit to Status or another route must not revive the previous reading position; same-page search/filter changes retain their normal input focus and history behavior.
- Stable content IDs distinguish card and action focus. Restore the actual keyboard entry, or the existing detail action for a pointer-only card surface. Measure document layout offsets, excluding temporary entrance/press transforms; keep the action visible between the measured top navigation and mobile tabbar. Resizes may reposition the entry; missing/hidden/expired origins fall back to the catalog heading.
- New PUSH details focus a `tabIndex={-1}` heading at the top after content is ready. POP details retain their remembered scroll position. With no in-memory position, direct/reloaded details retain native initial behavior; copied/reloaded detail return links still lead to the valid catalog heading. Real fragments resolve after asynchronous content exists and take precedence over a fresh top reset.
- User pointer, keyboard, touch or wheel interaction while content is pending cancels late automatic positioning. Route changes and Strict Mode replays clean up scheduled frames and listeners. Do not set global `history.scrollRestoration` or temporarily rewrite root scrolling styles.
- `reading:navigation-ui`, also included in full UI, verifies actual focus/geometry/history across the four standard widths, three themes and both navigation languages, plus ordinary motion, related/missing/copied/reloaded returns, duplicate catalog history entries, resized/hidden targets, fragments and delayed-content cancellation. Wait for finite entry animations and eager detail images when establishing stable test references; do not weaken geometry assertions to accommodate unsettled layout.

## Scenario: Public Assistant State

- The public widget is available on public routes and hidden on `/studio*`.
- Initial open state contains no default transcript/citation dump.
- Public suggestions and messages use sanitized public knowledge.
- Missing model/API displays a concise fallback status; it does not expose provider details.
- The widget prefers the same-origin SSE route, derives one bounded progress label from validated event stages including `recovering`, and renders only the terminal verified result. It falls back to the JSON route only when the stream endpoint is explicitly unsupported; rate limits and transport/provider failures never replay the question.
- Service warm-up is independent from conversation restore and answer state:
  `idle | warming | ready | error`. The initial persisted-session capability is
  retained while warming and consumed only after `ready`; composer draft state is
  never coupled to warm-up or restore completion.
- Public widget state is independent from Studio tokens and internal editing state.
- The conversation source of truth is typed logical Turns with immutable Revision snapshots, bounded Branch summaries, and one `activeBranchId`; do not rebuild it as a flat user/assistant message array.
- Pure projection/reducer helpers live outside the widget. Previewing a Revision changes only that Turn's viewed selection, while regeneration merges a new Revision without appending the same user question again.
- A local degraded answer may complete a pending new Turn, but it never becomes a synthetic Revision for a failed answer-regeneration intent. Keep the persisted active/viewed Revision and its navigation unchanged until a remote regeneration succeeds.
- Server recovery metadata belongs to the immutable Revision snapshot and remains distinct from a browser-local degraded fallback. Cancelling, switching sessions, restoring history, or starting a new conversation clears attempt progress and elapsed timers; late completion fences remain authoritative.
- Successful restore, Branch selection, and continue-from-revision replace the visible path atomically from the normalized server history. The browser never constructs persisted ancestry by joining local messages.
- Failed Branch selection and continue actions keep the current path, surface a retryable issue in the main conversation, and retain the exact bounded action for explicit retry. A synchronous pending fence prevents double-clicks from sending the action twice; only the authoritative success response hydrates a new path.
- Background health failures never replace a visible user-action issue carrying chat or Branch retry identity. Successful Branch completion clears only the Branch issue it owns, so late independent requests cannot erase another operation's recovery state.
- A completed replay triggers an authoritative Session-history refresh before the visible path changes. Older controllers, Session captures, frozen replay metadata, or failed history fetches must not move the current Branch head backward.
- A version-2 completion with `activated: false` belongs to a saved non-active Branch and must not enter the visible Turn list or prompt history. Fetch authoritative Session history just as for replay; if that refresh fails, keep the existing path, show a recovery notice, and disable follow-up until restore succeeds or the visitor starts a new conversation.
- Editing a persisted visitor question is an immutable Branch fork, never an in-place Turn mutation or `answer-revision`. Build a `new-turn` intent from the edited Turn's parent: the root uses `{ branchId: null, parentRevisionId: null }`; a later Turn uses the current `activeBranchId` plus that Turn's original `parentRevisionId`. Prompt history contains only Turns before the edited Turn.
- An edit-and-resend completion always refreshes authoritative Session history before replacing the visible path, even when the new Branch was activated normally. The pending projection may display progress, but it must not assemble or retain old descendants as persisted ancestry. Preserve the force-refresh flag across cancellation and explicit retry.

## Scenario: Public AI Daily Feed State

- Public Feed and detail responses pass through `src/utils/aiDailyPublicApi.ts`; route components do not cast `unknown` payloads or render unvalidated citation URLs.
- Starting a new Feed/detail request aborts the previous request. Route change and unmount abort the active request, and an intentional `AbortError` never becomes a visible network failure.
- A request sequence fence remains in place so a late response cannot overwrite a newer refresh, cursor page, or `publicId`.
- Feed refresh sends the current ETag, treats `304` as success, clears any transient error, and preserves the last successful payload. Cursor append does not send the Feed ETag and appends only the returned page.
- Transient refresh failure preserves the last successful payload and labels the failure. Visibility polling runs only while the document is visible and no more frequently than the configured 60-second interval.
- Detail route changes reset payload and ETag for the new `publicId`. A detail `304` preserves the loaded item and clears any previous error; `404` and `410` remain distinct user-facing terminal states.
- Loading, refreshing, stale, empty, error, correction, and pagination state must not discard readable approved content or create parallel requests.

### Public AI Daily Interface Language

#### 1. Scope / Trigger

Translate public feed/detail controls and state explanations without changing
approved projections, API decoding, publication decisions or SEO.

#### 2. Signatures

- `classifyAiDailyFeedError(status: number, error: string | null): AiDailyFeedError`
- `classifyAiDailyDetailError(status: number, error: string | null): AiDailyDetailError`
- `formatAiDailyDate(value: string, language: SiteLanguage = 'zh', includeYear = false)`
- `formatAiDailyTime(value: number, language: SiteLanguage = 'zh')`
- `aiDailyInterfaceCopy[language]` owns fixed labels and the finite error maps.

#### 3. Contracts

State stores error categories; render maps them to the current language. Feed
`load` retains `[]`, detail `load` retains `[publicId]`, and their effects retain
`[load]`. Language must not restart requests, the 60-second visibility timer,
abort/sequence fences, ETag state or loaded content. Detail SEO remains derived
from `[payload]` only. Date options retain short month, numeric day and two-digit
hour/minute; detail additionally includes the year. Preserve the local timezone
and original default hour cycle; omitted language remains Chinese.

Root UI carries the active language; approved title, facts, impact and uncertainty
retain `lang="zh-CN"`. Citation publisher/title/excerpt keep their original text
under `lang=""`; the source action has its own active-language span. Source URLs
and `target="_blank" rel="noreferrer"` remain unchanged. The four stable
`ai-daily-fact/impact/uncertainty/citations` IDs never depend on translated labels.
Optional sections still depend on uncertainty/citations, and the reading guide
receives `itemsLanguage={language}` without a language key or remount.

#### 4. Validation & Error Matrix

| Input / state | Required result |
| --- | --- |
| Feed 404 / 429 / 503 | not-found / rate-limited / not-configured, before network classification |
| Detail 404 | not-found, before withdrawn or network signals |
| Detail 410 with withdrawn code / other code | withdrawn / expired, before network classification |
| Network code / other failure | network / unavailable in the active language |
| Missing publicId | missing-id without starting a request |
| Empty or invalid date | Localized time-pending label; Chinese by default |
| Pending, failed, appended or 304 content | Language changes presentation only; existing payload/ETag retained |

#### 5. Good / Base / Bad Cases

Good: an already-visible 503 error changes language without another request.
Base: omitted formatter language retains the original Chinese date. Bad: storing
the translated error string or adding `language` to `load` dependencies.

#### 6. Tests Required

`ai-daily:public-payload-check` covers error priority, original Chinese messages,
both date locales and default options. `checkAiDailyInterfaceLanguage` in the
Node language entry and tsx full UI covers content/SEO identity, request counts,
polling starts, outline state/focus, reload/history, delays, errors, optional
sections, refresh/304, append ETags and aborted/late detail responses.

#### 7. Wrong vs Correct

Wrong: `setError(copy.feed.errors.network)` inside a language-dependent fetch.
Correct: `setError(classifyAiDailyFeedError(result.status, result.error))`, then
render `copy.feed.errors[error]` from the existing shared preference.

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

## Scenario: Project Catalog Discovery

- `src/utils/projectDiscovery.ts` owns the project `group` URL contract: `ai/fullstack/tool`, first duplicate value only, unknown values fall back to ai, default ai and unknown parameters are omitted from canonical URLs.
- The route is the source for the selected mobile group. Explicit changes push history, reselecting the same group does not, and URL normalization uses replace. Do not persist a second group state in browser storage.
- The existing 720px breakpoint only changes panel visibility: mobile shows the selected group; desktop shows every group and project. Resizing must preserve the URL selection and original category order/counts.
- Project/detail/related-project navigation carries the normalized group. Normal and missing-detail return links start from fixed `/projects`, never arbitrary returnTo. Blog readings and evidence/experience links keep their own addresses; SEO and analytics omit the group query.
- `projects:discovery-check` verifies the URL boundary; `projects:discovery-ui` (also included in full UI) covers history, reload, copied links, related/missing returns, keyboard access and breakpoint changes. Reading-position/focus restoration is a separate contract.

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
- `src/utils/blogDiscovery.ts` owns the blog `column/q/page` URL contract and the filtered/paginated projection. The route is authoritative; only the focused search input may keep a transient editing draft to avoid dropped characters during Router transitions. Blur/popstate discard that draft; never persist it or derive a separate result collection from it.
- Only known columns and safe positive integer pages are accepted; clamp valid pages to the filtered page count. Bound search to 120 Unicode code points while preserving typing spaces. Duplicate parameters use the first value, unknown parameters are discarded, and default values are omitted from canonical URLs.
- Normalize malformed URLs and update typed search with Router `replace`; explicit column/page changes create history entries. Browser back/forward and reload must derive the controls and result set from the resulting location.
- Event handlers merge edits into the current browser search, which can be newer than React Router's rendered location during a transition. Verify fast typing immediately after a column change so a stale render cannot drop characters or reset the column.
- Article and related-article links carry only this normalized search context. Normal/missing-detail return links are constructed from the fixed `/blog` path, never an arbitrary `returnTo`. Canonical SEO and analytics remain query/hash-free.
- Run `blog:discovery-check` for deterministic multi-page/invalid-input cases and `blog:discovery-ui` (also included in `check:ui`) for actual history, refresh, copied links, keyboard navigation and empty results. Scroll/focus restoration is a separate contract, not implied by preserving filter state.

## Mobile State Rules

- Touch gestures have one owner; page vertical scroll must not compete with nested horizontal/vertical gesture state.
- Mobile primary navigation contains only public sections: home, projects, blog/knowledge, status.
- Detail reading guides, public assistant, and bottom navigation coordinate offsets without overlapping final content.
- The public assistant launcher remains mounted through lazy chunk suspense; opening state is represented by a disabled warming trigger rather than a null fallback.
- Initial assistant history restore targets are retained across abort-only effect cleanup and consumed only after a successful or handled response, so Strict Mode replay cannot lose the restore capability.
- Reduced-motion state keeps a stable background frame while normal mode may animate.

## Avoid

- Duplicating route, server payload, or derived catalog state.
- Storing server credentials or owner identity in browser storage.
- Casting `unknown` API payloads inside components.
- Auto-running model/provider diagnostics from effects.
- Coupling Chatus or Learn state into this repository.
