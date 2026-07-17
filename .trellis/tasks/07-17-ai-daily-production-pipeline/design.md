# AI Daily production pipeline design

## Decision

Build one AI Daily editorial domain with two public products:

```text
AI Flash Feed
  = approved dynamic event cards from the latest 48-72 hours

Daily Deep Edition
  = one reviewed static Chinese article per day
```

The implementation stays in the existing Content Studio backend and PostgreSQL database. One repository-local batch runner performs collection, discovery, extraction, clustering, generation, and validation. A narrow public projection API serves approved flash items. The existing Publish Export path remains the only way to publish the daily deep edition.

The code is provider-neutral, but the production profile is not capability-optional. It requires real-time discovery and quality generation.

## End-To-End Shape

```text
Render Cron / queued Studio action
  -> batch coordinator + edition lock
  -> curated RSS / official APIs / release feeds
  -> Brave broad discovery
       -> Tavily search fallback
       -> optional xAI X signal radar
  -> safe direct fetch
       -> Firecrawl selected-page extraction
       -> Tavily Extract fallback
  -> canonicalization + deterministic dedupe
  -> event clustering + explainable rank + deterministic selection
  -> fact extractor
  -> strong Chinese composer
  -> risk-triggered verifier
  -> deterministic evidence and wording gate
  -> Studio event review
       -> lightweight flash approval -> public projection API
       -> daily edition review -> Publish Export -> static article
```

## Why This Product Shape

### Single daily article

It fits the existing static publication path and supports SEO, depth, and auditability, but can lag a breaking event by almost one day.

### Three scheduled editions per day

It improves latency but creates repeated stories, heavier editorial load, more deployment work, and notification fatigue.

### Rolling flash feed plus daily deep edition

This is the selected shape because it separates two different reader needs:

- the feed answers "what changed recently?";
- the daily article answers "what matters, what is connected, and why?".

The feed can update after a small approval action without rebuilding the site. The daily article remains the durable archive.

## Reference Projects

### HotDaily

Borrow the read/qualified/selected funnel, fact versus editorial layers, evidence-bound trends, and separate daily/history/trend/detail views. Do not treat its read-only Skill as a production backend.

### NewsPrism

Borrow event-level clustering, source tiers, replay, cross-source framing, and editorial feedback. Do not copy its full multi-language and all-LLM infrastructure.

### CondenseIt

Borrow source management, transparent scores, schedule controls, and cost budgets. Do not adopt its personalized reader-profile scope.

### ReadEverything

Borrow source-specific adapters and article-body extraction fallback. Do not introduce a universal browser, Gmail ingestion, or a separate vector database for the first production design.

## Runtime Profiles

### `fixture`

- All external boundaries use deterministic mocks.
- The full run, public API, Studio UI, and static export remain testable.
- Public projection tests use pre-seeded approval fixtures; the runner never gains an auto-approval path.
- No network or model call is allowed.

### `degraded`

- Stable sources and any healthy provider slots continue to operate.
- Missing discovery can still produce an evidence pack.
- Missing generation can still produce an editor-written draft.
- The run records missing capabilities, freshness gaps, and manual recovery steps.
- It cannot claim a normal current production edition.

### `production`

Required readiness checks:

```text
stable_source_registry.ready
discovery.primary.ready
evidence_extraction.primary.ready
generation.extractor.ready
generation.composer.ready
generation.verifier.ready
freshness_policy.configured
public_projection.configured
```

Configured fallbacks are checked and reported as `ready` or `reduced_redundancy`, but their absence alone does not make production `FAILED_CONFIG`. The readiness check validates configuration shape only. It never pings a provider. Real behavior is accepted through a user-approved business edition.

## System Boundary

### Existing components

- `biau-content-studio-api`: authenticated editorial API and Studio UI backend.
- Studio PostgreSQL: source registry, run state, evidence, issues, drafts, reviews, exports, flash approvals, and public projection data.
- Static frontend: reviewed daily editions and the client for the dynamic flash feed.

### New batch components

Two repository-local commands run as separate Render Cron Jobs. Both import shared Studio domain modules and use `STUDIO_DATABASE_URL`.

They are not new HTTP microservices. Long collection, search, extraction, and model calls never run inside a Studio request.

Recommended commands:

```text
npm run ai-daily:ingest-tick
npm run ai-daily:editorial-tick
npm run ai-daily:collect -- --date YYYY-MM-DD
npm run ai-daily:discover -- --date YYYY-MM-DD
npm run ai-daily:compose -- --date YYYY-MM-DD
npm run ai-daily:run -- --date YYYY-MM-DD
npm run ai-daily:resume -- --run-id <id>
```

`ai-daily:ingest-tick` claims due source, discovery, and evidence-fetch work. `ai-daily:editorial-tick` claims generation, flash refresh, approved manual rerun, and daily-edition work. Both use database leases, explicit priority, a bounded job deadline, and durable continuation for unfinished work.

### Public projection API

The existing Studio service exposes two unauthenticated read-only routes:

```text
GET /public/ai-daily/feed?cursor=<cursor>&limit=<limit>
GET /public/ai-daily/events/:publicId
```

These routes read only approved projection records. They never return Studio candidates, evidence bodies, provider data, internal IDs, prompts, reviews, or credentials.

Public endpoint rules:

- versioned DTOs and bounded `limit` values;
- configured `PUBLIC_SITE_ORIGINS` CORS allowlist;
- CDN cache plus application rate limiting;
- indexed projection-only queries with a fixed query budget;
- explicit route tests proving Studio authentication middleware is neither required nor bypassed for any other Studio route;
- `404` for unknown/never-approved IDs and `410` for withdrawn or expired IDs.

## Capability Contracts

### Stable source adapters

```ts
interface SourceAdapter {
  kind: AiDailySourceKind
  collect(source: SourceDefinition, window: CollectionWindow): Promise<CollectedItem[]>
}
```

Initial adapters:

- RSS/Atom
- official page/watch URL
- GitHub Releases/Atom
- Hacker News public API
- manual URL submission

### Discovery providers

```ts
interface DiscoveryProvider {
  slot: "primary" | "fallback" | "signal"
  discover(request: DiscoveryRequest): Promise<DiscoveryResult>
}

type DiscoveryRequest = {
  queryGroup: string
  queries: string[]
  startAt: string
  endAt: string
  locales: string[]
  includeDomains: string[]
  excludeDomains: string[]
  maxResults: number
  budget: ProviderBudget
}
```

The result contains candidate URLs, timestamps, provider result IDs, and discovery metadata only.

Recommended production mapping:

| Slot | Adapter | Purpose |
| --- | --- | --- |
| primary | Brave Search API | broad global and Chinese gap discovery with freshness and domain controls |
| fallback | Tavily Search | recommended same-capability fallback with news/date filters and optional raw content |
| signal | xAI X Search | early posts from approved vendor/researcher accounts; lead generation only |

The system does not run all providers for every query. It calls the primary, uses fallback on bounded eligible failures or low coverage, and uses the signal slot only for configured early-signal queries.

### Evidence extraction providers

```ts
interface EvidenceExtractor {
  extract(request: EvidenceRequest): Promise<EvidenceDocument>
}
```

Order:

1. safe direct HTTP extraction for compatible public pages;
2. Firecrawl for selected pages, difficult markup, or JavaScript rendering;
3. Tavily Extract fallback when configured.

Search snippets and generated answers never satisfy this contract.

### Embedding provider

```ts
interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}
```

Embedding improves event grouping after deterministic dedupe. It is not a publication dependency because lexical grouping and editor merge/split remain valid degraded paths.

### Generation roles

```ts
interface StructuredGenerationProvider {
  role: "extractor" | "composer" | "verifier"
  generate<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>>
}
```

Each role has `primary` and optional ordered `fallback` adapters. A fallback must meet the same schema and quality contract. A low-capability model cannot silently replace a stronger composer and still report normal success.

## Source Policy And Cadence

### Registry

`AiDailySourceFeed` stores:

- name, kind, URL, locale, tier, topics
- enabled state and collection interval
- last/next collection time
- consecutive failures and sanitized last error
- optional official-domain ownership

Initial editorial set: roughly 30-80 carefully selected sources.

### Tiers

- Tier 1: official model vendors, cloud platforms, standards bodies, research institutions, project releases.
- Tier 2: trusted technical media and expert blogs.
- Tier 3: community, Hacker News, trending, and social signals.

Tier 3 may create a lead or reaction summary, but cannot alone support "officially released", pricing, API behavior, or availability wording.

### Collection cadence

```text
Tier 1 RSS / official releases: every 15 minutes
Tier 2 technical media: every 30 minutes
Tier 3 community signals: every 60 minutes
Broad Brave discovery: every 2 hours
Mandatory broad discovery: immediately before daily composition
Original-page fetch: immediately after candidate qualification
Fetch retry: approximately 5 / 20 / 60 minutes
Daily composition: around 07:00 Asia/Shanghai
```

Every scheduled collector uses an overlapping lookback plus canonical dedupe. Source failure does not erase previously collected candidates.

### Freshness gates

At composition time, production requires:

- last successful Tier 1 collection age <= 30 minutes;
- last successful broad discovery age <= 150 minutes;
- a recorded original-page fetch checkpoint for the selected set;
- visible `newestPublishedAt`, `lastCollectedAt`, `lastDiscoveredAt`, `lastFetchedAt`, and end-to-end lag.

The feed API reports `projectionGeneratedAt`, `pipelineFreshnessAt`, `lastApprovedAt`, `editorialCoverage`, and `stale`; the client preserves the last successful response during API degradation.

### End-to-end latency gates

Automation targets:

```text
Tier 1 publication -> discovery: p95 <= 30 minutes
successful evidence -> review-ready flash: p95 <= 15 minutes
editor approval -> public API visibility: p95 <= 2 minutes
```

During configured editorial coverage, discovery to public approval targets p50 <= 30 minutes and p95 <= 60 minutes. Outside coverage, or after six hours without a new approval, the API and UI expose an explicit stale/editorial-coverage state.

## Discovery Strategy

Broad discovery runs query groups rather than one query per candidate:

1. core AI model and platform releases;
2. research papers, benchmarks, and safety work;
3. developer tools, open-source releases, and infrastructure;
4. Chinese ecosystem and product changes;
5. major follow-up or correction queries for active events.

Query groups include date windows and selected domain controls. Coverage is evaluated by unique authoritative domains, new event clusters, locale balance, and overlap with stable sources.

Discovery output enters the same canonicalization, fetch, and evidence path as a feed item.

## Safe Fetch And Evidence

Direct fetch rules:

1. Reject credentials, unsupported schemes, localhost/internal names, and private/loopback/link-local/multicast/metadata IP literals.
2. Resolve A/AAAA records, reject non-public addresses, and pin validated lookup results.
3. Revalidate every redirect; maximum 5 redirects.
4. Enforce connect/read/total timeouts, compressed and decoded body limits, and expected content types.
5. Honor source opt-out and robots rules.
6. Extract title, publisher, public author, publication time, headings, and at most 64 KiB normalized main text.
7. Retain full bounded evidence for 30 days; Studio shows at most 8 KiB; selected citations retain metadata plus at most a 1 KiB excerpt.

Firecrawl and Tavily adapter responses are normalized into the same evidence contract. Raw provider bodies are never persisted.

## Dedupe, Grouping, Ranking, And Selection

Run in order:

1. canonical URL equality;
2. normalized content hash equality;
3. normalized title fingerprint;
4. high lexical similarity in the edition window;
5. optional embedding/model event grouping;
6. editor merge/split override.

Ranking stores named components:

- authority
- recency
- AI relevance
- information density
- corroboration
- novelty against recent editions
- topic/domain diversity adjustment

Models may assist relevance or information density but never own uniqueness, approval, or the only rank signal.

### Baseline selection contract

Selection operates on one representative per event cluster after unsafe, unfetched, and rejected candidates are excluded.

```text
minScore: 55 / 100
targetEvents: 8
minEvents: 5
maxEvents: 10
maxEventsPerDomain: 2
maxEventsPerTopic: 3
minDistinctDomains: 3
minTier1Sources: 2
```

Stable ordering:

1. total score descending;
2. authority descending;
3. corroboration descending;
4. publication time descending, missing last;
5. canonical URL ascending.

The selector applies caps and stops at the target unless more events are needed for minimum evidence diversity. It never exceeds `maxEvents`.

Failure of `minEvents`, `minDistinctDomains`, `minTier1Sources`, or freshness gates ends as `COMPLETED_WITH_GAPS` and makes the issue `NEEDS_MORE_EVIDENCE`.

Editor overrides store a reason and increment the selection version. Composition binds to one explicit selection version.

## Generation Pipeline

### Stage 1: fact extraction

Candidate evidence is batched by token budget. The extractor returns atomic facts only:

```ts
type Evidence = {
  evidenceId: string
  sourceId: string
  url: string
  sourceKind: "official" | "primary_media" | "secondary_media" | "social" | "unknown"
  publishedAt: string | null
  retrievedAt: string
  quote: string
  locator: { heading?: string; startChar?: number; endChar?: number }
}

type AtomicClaim = {
  claimId: string
  text: string
  claimType: "announcement" | "release" | "metric" | "date" | "price" | "quote" | "interpretation"
  evidenceIds: string[]
  directSupport: boolean
  conflictingEvidenceIds: string[]
  uncertainty: "low" | "medium" | "high"
}
```

Schema repair is allowed once. Invalid evidence IDs fail closed.

### Stage 2: Chinese composition

The composer receives validated fact cards, not raw search results or an unrestricted web tool. It returns structured JSON for:

- edition title and subtitle;
- compact editorial introduction;
- event title, fact summary, why it matters, and uncertainty;
- cross-event trends with claim IDs;
- flash-card variants for qualified events.

It cannot add a URL or fact not present in the evidence pack.

### Stage 3: risk-triggered verification

The verifier runs through a different model/provider slot for:

- headline events;
- numbers, dates, versions, prices, policy, availability, security, or legal implications;
- single-source claims;
- composer wording without a direct supporting quote;
- corrections and event-state changes.

Verifier output:

```ts
type ClaimReview = {
  claimId: string
  verdict: "entailed" | "contradicted" | "insufficient" | "unverifiable"
  supportingEvidenceIds: string[]
  reasonCode: "exact_support" | "scope_inflation" | "date_mismatch" | "number_mismatch" | "attribution_error" | "missing_support"
  correctedText: string | null
}
```

The verifier cannot introduce new facts or sources.

### Stage 4: deterministic gate

Reject:

- unknown or unfetched source IDs;
- factual sentences without evidence IDs;
- official/price/API/availability wording without appropriate Tier 1 evidence;
- generated URLs;
- duplicate signals;
- contradicted or insufficient high-risk claims;
- unsupported absolute or sensational wording.

Do not use model confidence numbers as publication truth.

### Call budget

For approximately 15-30 qualified candidates:

- extractor: 2-5 batched calls;
- composer: 1 call;
- verifier: 1 batched call, split only when required;
- schema repair: at most 1 per stage.

Normal target: 4-7 calls per edition.

## Quality Evaluation

Model IDs are configuration, not architecture. Final model selection uses a BIAU-owned offline test set containing official releases, multi-source events, Chinese and English sources, correction cases, numeric claims, and low-evidence rumors.

Rubric:

| Dimension | Required behavior |
| --- | --- |
| factual fidelity | no unsupported critical claim |
| citation coverage | every verifiable factual sentence binds to evidence |
| Chinese readability | concise, natural, no translation-like repetition |
| information density | facts and impact, not generic filler |
| title restraint | no unsupported superlative or clickbait |
| fact/opinion separation | editorial analysis is labeled and source-bound |
| uncertainty | rumors, incomplete rollout, and conflicts are explicit |
| duplication | one event is not repeated across sections |

The evaluation stores per-role results so the extractor, composer, and verifier can use different models.

Initial production quality floor:

```text
evaluation cases: at least 30 evidence-labeled cases
critical factual errors: 0
published-claim citation precision: 100%
verifiable-sentence citation coverage: >= 98%
editor acceptance with no more than minor edits: >= 85%
average Chinese editorial score: >= 4 / 5
fallback acceptance score: within 5 percentage points of primary
```

## Data Model

### `AiDailySourceFeed`

Editable source registry and health state.

### `AiDailyRun`

- profile, edition date, trigger, attempt number, status, current stage, config version
- start/end timestamps, freshness checkpoints, counters, sanitized final error

### `AiDailyRunEvent`

Append-only stage and provider-attempt audit with bounded JSON metadata.

### `AiDailyCandidate`

- source observation and original/normalized/canonical URL
- title fingerprint and content hash
- fetch/evidence status, date, locale, source tier
- bounded evidence and expiry
- duplicate/cluster/selection state and score components
- optional promoted `sourceItemId`

### `AiDailyCluster`

- representative and member candidates
- grouping reason, topic, corroboration count, rank, editor state

### `AiDailyIssueSource`

Ordered relational link from an issue to canonical `SourceItem` rows. It replaces `sourceIdsJson` as the authoritative relation.

### `AiDailyGeneratedRevision`

Immutable composition with evidence/source bindings, selection version, prompt/schema/model-role metadata, observed draft version, apply state, and validation status `VALID`, `NEEDS_EDITOR_REVIEW`, or `REJECTED`.

### `AiDailyFlashItem`

Logical public event identity:

- stable `publicId` and source cluster identity
- current approved revision ID and lifecycle state
- `ACTIVE`, `HELD`, or `WITHDRAWN`
- created, last-approved, and withdrawn timestamps

### `AiDailyFlashRevision`

Immutable content revision:

- title, fact summary, why-it-matters, uncertainty/correction state
- approved citation snapshots and selection/evidence version
- `DRAFT`, `APPROVED`, `REJECTED`, or `SUPERSEDED`
- editor, approval timestamp, revision number, and superseded revision link

Correction creates a new `DRAFT` revision. Approval transactionally marks the previous `APPROVED` revision `SUPERSEDED`, makes the new revision current, increments the public revision, and changes the projection ETag. Withdrawal marks the logical item `WITHDRAWN` and removes it from feed/detail projection immediately.

Only the current `APPROVED` revision of an `ACTIVE` item inside the retention window enters the public projection.

## State Ownership

`AiDailyRun.status`:

```text
QUEUED
RUNNING
COMPLETED
COMPLETED_WITH_GAPS
FAILED_CONFIG
FAILED
CANCELLED
```

`AiDailyRun.currentStage`:

```text
COLLECT
DISCOVER
FETCH
DEDUPE
GROUP
RANK
PROMOTE
EXTRACT_FACTS
COMPOSE
VERIFY
VALIDATE
DRAFT
```

`AiDailyIssue.status`:

```text
COLLECTING
EVIDENCE_READY
NEEDS_MORE_EVIDENCE
REVIEW_NEEDED
EXPORTED
REJECTED
```

Mappings:

- `fixture` may complete with mock capabilities.
- `degraded` with sufficient evidence but no composition -> issue `EVIDENCE_READY`.
- schema-valid composition with non-critical verifier/editorial flags -> generated revision `NEEDS_EDITOR_REVIEW`, issue remains `EVIDENCE_READY`.
- explicit editor creation of a linked hidden `manual` draft from `EVIDENCE_READY` -> issue `REVIEW_NEEDED`.
- any profile with failed evidence/freshness gates -> run `COMPLETED_WITH_GAPS`, issue `NEEDS_MORE_EVIDENCE`.
- `production` missing required capability configuration -> `FAILED_CONFIG`.
- valid composition and hidden draft -> issue `REVIEW_NEEDED`.
- accepted Publish Export -> issue `EXPORTED`.
- explicit editor rejection -> issue `REJECTED`.

Draft approval belongs to `ContentDraft` and `ContentReview`. `EXPORTED` never means deployed publicly.

## Run Model

```text
status QUEUED
  -> RUNNING / COLLECT
  -> DISCOVER
  -> FETCH
  -> DEDUPE
  -> GROUP
  -> RANK
  -> PROMOTE
  -> EXTRACT_FACTS
  -> COMPOSE
  -> VERIFY
  -> VALIDATE
  -> DRAFT
  -> COMPLETED

evidence/freshness minimum not met -> COMPLETED_WITH_GAPS
non-critical composition quality flags -> persist NEEDS_EDITOR_REVIEW revision, run COMPLETED
production capability config missing -> FAILED_CONFIG
infrastructure/schema failure -> FAILED
operator cancellation -> CANCELLED
FAILED -> resume from last durable checkpoint
```

### Idempotency

- `AiDailyIssue.date` is the edition identity.
- A PostgreSQL advisory lock is keyed by edition date.
- Inside the lock, the coordinator checks for another active run.
- Attempts receive separate history IDs and config versions.
- Scheduled and manual triggers compete for the same lock.
- Logical flash identity is unique by stable event/cluster identity; revision identity is unique by `flashItemId + revisionNumber`.
- Ingestion and editorial work items use idempotency keys, claim leases, attempt history, and a persisted continuation cursor.

## Draft And Revision Protection

- A valid first composition may create one hidden `review-needed` draft.
- In degraded mode, an editor may explicitly create one linked hidden `manual` draft from an `EVIDENCE_READY` issue. The action records the selected evidence version and moves the issue to `REVIEW_NEEDED`.
- A `NEEDS_EDITOR_REVIEW` generated revision appears in Edition with claim-level findings. The editor may correct its structured fields; deterministic validation must then mark a new immutable revision `VALID` before it can create or update a draft.
- A runner never overwrites an existing draft.
- Later compositions create `AiDailyGeneratedRevision` and `newEvidenceAvailable`.
- Editors explicitly apply a revision with `expectedUpdatedAt`.
- Any newer edit, review, approval, export, rejection, or archive blocks application.

## Studio UX

### Runs

- stage, outcome, profile, freshness, counts, duration, retry/cancel, sanitized errors
- collection funnel: collected, discovered, fetched, qualified, clustered, selected, generated, verified

### Sources

- add/edit/disable source, tier/topic/locale/cadence
- last success, consecutive failures, recent items, source lag

### Candidates And Events

- original link and evidence preview
- duplicate/group reason and corroborating sources
- score breakdown and freshness
- include/exclude/reorder/merge/split/request-evidence actions

### Flash Review

- generated title, fact summary, why-it-matters, uncertainty, citations
- approve, hold, correct, supersede, withdraw
- public preview and API visibility state

### Edition

- selected event set and evidence pack
- claim-level citations and verifier results
- generated revision versus current draft diff
- draft review, Publish Export, and static article navigation

Responsive acceptance uses `1440x1000` and `390x844` viewports. Primary workspaces, toolbars, source cards, evidence text, commands, and tables must not create unintended horizontal overflow or clipped controls.

## Public Feed Contract

The API returns a field-whitelisted envelope:

```ts
type PublicAiDailyFeed = {
  apiVersion: "v1"
  projectionGeneratedAt: string
  pipelineFreshnessAt: string | null
  lastApprovedAt: string | null
  editorialCoverage: "active" | "paused" | "unknown"
  stale: boolean
  nextCursor: string | null
  items: Array<{
    publicId: string
    revision: number
    title: string
    summary: string
    whyItMatters: string
    uncertainty: string | null
    publishedAt: string | null
    approvedAt: string
    correctedAt: string | null
    sources: Array<{ title: string; publisher: string; url: string; publishedAt: string | null }>
  }>
}
```

Event detail uses the same public item DTO plus `relatedEventIds` and the complete approved citation list. It does not expose extra internal fields.

Detail resolution:

```text
unknown or never approved -> 404
withdrawn or expired -> 410
superseded revision URL/ID -> resolve the stable public ID to the current approved revision
```

Response headers:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: <projection hash>
```

The frontend requests once on load, refreshes at most every 60 seconds while visible, pauses in background tabs, and keeps the last successful payload during API errors. A successful but stale API response is visibly labeled from `stale`, `pipelineFreshnessAt`, `lastApprovedAt`, and `editorialCoverage`.

## Publication Authority

- Lightweight flash approval is the only authority for feed cards.
- Draft review is the only authority for the daily edition.
- Publish Export `passed` means accepted local export.
- The deployed static catalog and synthetic checks are the daily archive truth.

## Observability And Retention

Stable error categories:

```text
config_error
auth_error
rate_limited
timeout
network_error
unsafe_url
robots_disallowed
render_required
fetch_empty
invalid_response
evidence_rejected
schema_invalid
quality_rejected
freshness_stale
```

- Network, timeout, and rate-limit errors use bounded retry under the run deadline.
- Auth, config, and schema errors do not retry indefinitely.
- Missing required production configuration is `FAILED_CONFIG`. Runtime discovery, extraction, or generation failure becomes `COMPLETED_WITH_GAPS` without erasing stable-source results. Only infrastructure/database/schema failure becomes `FAILED`.
- Metrics use stage, outcome, capability, and provider slot; public dashboards do not expose private provider names or URLs.
- Evidence and provider events expire after 30 days; selected citation metadata and run summaries remain auditable.
- Sensitive-output tests scan logs, event JSON, temp artifacts, API payloads, and generated content for secret-like values, credential-bearing URLs, authorization material, database schemes, PEM markers, absolute private env paths, and raw provider bodies.

## Deployment And Rollback

- One Render Cron Job runs `ai-daily:ingest-tick` frequently enough to honor the 15-minute Tier 1 cadence.
- A separate Render Cron Job runs `ai-daily:editorial-tick` for generation, flash refresh, approved manual work, and daily composition.
- Render schedule uses UTC; application due-time calculations use `Asia/Shanghai`.
- Studio manual trigger writes `QUEUED`; the editorial tick claims it. Render manual Cron trigger remains the urgent operator path.
- Each tick has a deadline shorter than its schedule interval. Work claims use leases; unfinished work persists and resumes without starving Tier 1 collection or the daily deadline.
- PostgreSQL is the only authoritative persistence. Cron temp files are disposable.
- The existing Studio web service serves the public feed projection.
- Disable both Cron Jobs and the public feed flag to roll back automation. Manual Studio and offline draft workflows remain available.
- No migration or rollback deletes existing sources, drafts, reviews, or exports.

## Concrete Production Recommendation

Default deployment:

```text
Discovery primary: Brave Search API
Evidence extraction: safe direct HTTP, then Firecrawl
Recommended search/extract fallback: Tavily
Early social radar: xAI X Search only when intentionally configured
Generation: evaluated extractor + strong composer + independent verifier slots
Database: existing Studio PostgreSQL
Scheduler: separate ingest and editorial Render Cron Jobs
Public real-time surface: approved feed projection on existing Studio API
Daily archive: existing static Publish Export
```

This is the selected BIAU architecture. Provider-neutral interfaces protect maintainability; they do not reduce the production requirement for search, generation, and fresh evidence.
