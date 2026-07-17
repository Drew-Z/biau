# AI Daily production pipeline

## Goal

Build AI Daily as a production editorial product for BIAU Port with two reader-facing surfaces:

1. an approved rolling AI flash feed for current events; and
2. one evidence-rich Chinese deep edition each day for analysis, archive, and SEO.

The production system must provide both real-time discovery and high-quality model-assisted composition. The domain remains provider-neutral so a vendor can be replaced, but production readiness is capability-dependent rather than provider-free.

## Product Profiles

### `fixture`

- Uses local fixtures and mock providers only.
- Proves deterministic collection, evidence, ranking, generation, validation, API, and UI behavior.
- Makes no live search, extraction, embedding, or model calls.

### `degraded`

- Uses stable sources and any capabilities that are currently available.
- May produce an evidence pack or manual draft when search or generation is unavailable.
- Must expose stale or missing capabilities and cannot report a normal production edition as ready.

### `production`

- Requires a healthy real-time discovery slot and a quality-generation slot.
- Requires one healthy provider per required capability, records reduced redundancy when no fallback is configured, and always requires a fresh original-page evidence checkpoint.
- A missing or stale required capability ends as `COMPLETED_WITH_GAPS` or `FAILED_CONFIG`, never silent success.

## Background

- AI Daily is unrelated to Legal RAG, Operator RAG, the public assistant, and the `learn` application.
- Content Studio already supports sources, AI Daily issues, hidden drafts, human reviews, Publish Export, and static-site export.
- The existing offline AI Daily script only converts a prepared JSON source pack into Markdown. It does not collect, discover, fetch, deduplicate, schedule, or publish.
- The public site currently reads reviewed, Git-tracked static content. The rolling feed adds one narrow public projection API that exposes approved flash items only.
- HotDaily's public Skill is a read-only client, not a production pipeline. Its useful product ideas are the selection funnel, fact/editorial separation, evidence-bound trends, and archive views.
- NewsPrism, CondenseIt, ReadEverything, Horizon, and similar projects provide reusable patterns for adapters, event clustering, ranking, scheduling, replay, and static output, but none should be copied wholesale.
- Smart-search was used for research only. It is not the runtime service for AI Daily.
- Live provider calls are allowed only as part of a user-approved real AI Daily business run. Provider ping, doctor, diagnose, empty prompts, and liveness-only tests remain prohibited.

## Requirements

### R1. Reader product: rolling flash feed plus daily deep edition

- The `AI Flash Feed` shows editor-approved event cards from the latest 48-72 hours.
- Each flash card contains a restrained Chinese title, fact summary, why-it-matters note, uncertainty or correction state, approval time, and clickable original sources.
- Collection, evidence processing, clustering, ranking, and draft generation may be automated; a new public statement requires an explicit lightweight editor approval.
- The public feed is served by a read-only field-whitelisted API with ETag support and a 60-second CDN cache.
- The `Daily Deep Edition` is composed once each morning from verified event clusters, reviewed through the existing draft workflow, and exported as static content.
- Flash items do not trigger a full-site rebuild. The daily edition remains the durable public archive and SEO truth.

### R2. Stable source registry and real-time discovery

- Maintain an editable Studio registry with source type, URL, tier, topic, locale, enabled state, collection cadence, and health information.
- Initial stable types are RSS/Atom, official announcement pages, GitHub Releases, Hacker News/API feeds, and manually submitted public URLs.
- Start with roughly 30-80 curated sources and expand from measured coverage and health.
- Tier 1 official/research sources support factual release claims; Tier 2 trusted technical media provide context; Tier 3 community sources provide leads and reactions.
- Define a provider-neutral `DiscoveryProvider`, but ship the recommended production adapters:
  - Brave Search API as the primary broad real-time gap-discovery provider;
  - Tavily Search as the recommended full-search fallback;
  - optional xAI X Search as an early social-signal radar, never as final evidence.
- Search output can create candidate URLs only. It cannot become evidence until an original or authoritative page is fetched successfully.
- Provider concurrency, request count, timeout, retry, fallback, and cost budgets must be bounded and visible.

### R3. Original-page extraction and evidence

- Retrieve and validate the original page for every candidate selected for editorial use.
- Use direct safe HTTP extraction for compatible stable sources, Firecrawl for filtered page extraction and JavaScript-heavy pages, and Tavily Extract as fallback when configured.
- Store canonical URL, public title, publisher, publication time when available, language, retrieval state, content hash, fetched time, and bounded supporting text.
- Prefer official announcements, papers, release notes, product documentation, and repository releases over reposts or generated search summaries.
- Keep failed, blocked, or unverified candidates visible with stable failure categories; never silently convert them into facts.
- Apply SSRF, redirect, body-size, content-type, timeout, robots/source opt-out, and private-network protections before every direct fetch.

### R4. Deduplication and event grouping

- Normalize tracking parameters and canonical URLs before model processing.
- Deduplicate deterministically by canonical URL, content hash, title fingerprint, and bounded lexical similarity.
- Preserve duplicate reasons, representative source, corroborating sources, and cluster membership.
- Add semantic event clustering through an optional `EmbeddingProvider` or bounded model step. Deterministic groups and manual merge/split remain the degraded fallback.
- Do not let an LLM rank raw duplicate lists by apparent frequency.

### R5. Freshness and coverage SLO

- Target Tier 1 official RSS/releases every 15 minutes, Tier 2 media every 30 minutes, and community signals every 60 minutes.
- Run broad discovery every 2 hours and once immediately before daily composition.
- Fetch accepted candidate URLs immediately, with bounded retries near 5, 20, and 60 minutes.
- Start daily composition around 07:00 `Asia/Shanghai` after a required fresh collection and discovery checkpoint.
- At composition time, production requires:
  - a successful Tier 1 collection no older than 30 minutes;
  - a successful broad discovery checkpoint no older than 150 minutes;
  - visible freshness metadata for the newest candidate, last successful fetch, and end-to-end lag.
- A stale checkpoint makes the edition degraded or `NEEDS_MORE_EVIDENCE`; it cannot be presented as a normal current edition.
- Automation SLOs are measured separately from human editorial latency:
  - Tier 1 publication to discovery: p95 <= 30 minutes;
  - discovery with successful evidence to review-ready flash: p95 <= 15 minutes;
  - editor approval to public API visibility: p95 <= 2 minutes.
- During configured editorial coverage, the product target from discovery to public approval is p50 <= 30 minutes and p95 <= 60 minutes.
- Outside editorial coverage, or when no flash has been approved for 6 hours, the feed must display the last approval time and an explicit stale/editorial-coverage state rather than implying live coverage.

### R6. Explainable editorial selection

- Rank event clusters with an inspectable breakdown covering authority, recency, AI relevance, information density, corroboration, novelty against recent editions, and topic/domain diversity.
- Enforce configurable domain and topic caps so one vendor or repeated story cannot dominate an edition.
- Provide a deterministic baseline selection policy with configured minimum score, target/minimum/maximum event count, evidence gates, and stable tie-breaking.
- Allow editors to include, exclude, reorder, merge, split, or request more evidence without editing raw database JSON.
- Promote selected candidate observations into canonical `SourceItem` records transactionally while preserving human-authored fields on collisions.

### R7. High-quality evidence-bound generation

- Define provider-neutral extractor, composer, and verifier capability slots with ordered fallbacks.
- The production composition pipeline is:

```text
structured fact extractor
  -> strong Chinese composer
  -> risk-triggered verifier from another model/provider
  -> deterministic citation and wording gate
```

- The extractor creates atomic facts, exact supporting quotes, dates, entities, source type, and evidence IDs.
- The composer receives only validated fact cards and creates titles, concise summaries, why-it-matters analysis, section ordering, and cross-event trends.
- The verifier checks high-risk claims such as numbers, dates, prices, policy, availability, security, and unsupported strong wording. It cannot introduce new facts.
- Every factual sentence must bind to stored evidence IDs. Unknown URLs or model-created citations are rejected.
- Typical editions should batch work into roughly 4-7 model calls rather than one multi-model vote per article.
- Record model role, identifier, prompt/schema version, sanitized attempt outcome, latency, and bounded usage metadata.
- Missing generation is allowed only in `fixture` or `degraded`; production cannot reach `REVIEW_NEEDED` without a valid composition.

### R8. Content quality gate

- Use a BIAU-owned offline evaluation set and editorial rubric rather than selecting models from public rankings alone.
- The rubric covers factual fidelity, citation coverage, Chinese readability, information density, duplication, restrained titles, fact/opinion separation, and uncertainty wording.
- Publication candidates require zero known unsupported critical claims and complete evidence binding for verifiable factual sentences.
- The initial quality floor uses at least 30 evidence-labeled cases and requires: zero critical factual errors, 100% citation precision for published claims, at least 98% citation coverage for verifiable sentences, at least 85% editor acceptance with no more than minor edits, and average Chinese editorial quality >= 4/5.
- A fallback composer or verifier must keep zero critical errors and remain within 5 percentage points of the primary role's acceptance score.
- Evidence/citation hard failures remove the affected claim; if the remaining set misses evidence minimums, the issue becomes `NEEDS_MORE_EVIDENCE`.
- A schema-valid composition with non-critical verifier disagreement or editorial-quality flags is stored as an immutable `NEEDS_EDITOR_REVIEW` generated revision while the issue remains `EVIDENCE_READY`. An editor may correct it in the Edition workspace, rerun deterministic validation, and only then promote it to a draft.
- A failed claim or revision is never repaired by inventing content.
- The first live edition is a user-approved acceptance task and becomes the first golden evaluation case.

### R9. Studio workflow

- Persist each run, stage, candidate, evidence record, duplicate/cluster decision, ranking breakdown, provider attempt, final selection, generated revision, and approval action.
- One edition date owns one AI Daily issue and ordered source set.
- Keep run stage, run terminal outcome, issue editorial state, flash approval state, and draft/review state as separate contracts.
- Studio exposes Runs, Sources, Candidates/Events, Flash Review, and Edition views with sanitized errors.
- Flash Review supports approve, hold, correct, and withdraw actions for generated event cards.
- A valid composition may create the first linked `hidden + review-needed + draft-assisted` daily draft.
- A `NEEDS_EDITOR_REVIEW` generated revision is reviewable in Edition but is not yet a `ContentDraft` and does not move the issue to `REVIEW_NEEDED` until corrected and revalidated.
- In `degraded`, an editor may explicitly create a linked `hidden + review-needed + manual` draft from an `EVIDENCE_READY` issue. This action changes the issue to `REVIEW_NEEDED`, records the selection version, and never grants the runner approval authority.
- Correcting a public flash creates a new immutable draft revision. Approving it atomically marks the prior approved revision `SUPERSEDED`, publishes the new revision under the same stable public ID, and changes the ETag. Withdrawing marks the logical flash unavailable immediately.
- Later runs append immutable revisions and never overwrite human-edited or reviewed content.

### R10. Scheduling and recovery

- Provide deterministic commands for scheduled tick, collection, discovery, composition, manual date runs, and checkpoint resume.
- Use an independent batch process sharing the Studio database and domain services; do not run long search/model work inside an HTTP request.
- Default production target is two repository-local Render Cron Jobs sharing PostgreSQL: an ingestion job for source/discovery/fetch work and an editorial job for generation, flash refreshes, and daily composition.
- Work claims use leases and idempotency keys. Each job has a deadline, persists unfinished work, and resumes it in the next tick instead of holding a request or silently dropping backlog.
- Queue priority is explicit: approved manual reruns, Tier 1 collection, evidence fetch retries, due daily composition, broad discovery, then lower-tier collection.
- Use one edition-date lock and uniqueness boundary shared by scheduled and manual triggers. Run attempts use separate history IDs.
- Persist every stage before advancing so retry resumes from the last durable checkpoint.
- Required production discovery or generation failure produces an explicit degraded outcome. Infrastructure/database/schema failure fails the run.

### R11. Publication boundary

- Human review is the only approval authority for new public wording.
- The runner never approves a flash, approves a daily draft, exports, commits, pushes, deploys, or directly publishes content.
- The public feed exposes approved flash projections only and never exposes candidates, evidence bodies, prompts, provider metadata, internal IDs, or review records.
- Public routes use a versioned DTO, bounded `limit`, cursor validation, configured CORS allowlist, CDN cache verification, rate limiting, indexed projection queries, and explicit separation from Studio authentication middleware.
- A withdrawn or expired event detail returns `410 Gone`; an unknown or never-approved event returns `404`; a superseded revision resolves only to the current approved representation for the stable public ID.
- Source title, publisher, publication date, canonical URL, and short supporting excerpt survive Studio draft creation and static export.
- `PublishExport checks=passed` means exported locally, not deployed publicly.
- Hidden issues, evidence, and drafts remain absent from public selectors, assistant knowledge, sitemap, and search until reviewed static content is deployed.

### R12. Security, retention, and observability

- Never log or persist API keys, bearer tokens, database URLs, private endpoints, headers, env-file paths, raw provider bodies, or stack traces.
- Store normalized error categories, elapsed time, result counts, fallback outcome, freshness, coverage, and low-sensitive counters.
- Store at most 64 KiB normalized evidence per fetched page for 30 days, show at most 8 KiB in Studio, and retain at most a 1 KiB supporting excerpt per selected citation.
- Expose low-cardinality metrics for outcome, stage duration, source health, discovery/fetch/review/approval/publication lag, candidate age, backlog, lease expiry, counts, duplicate compression, citation validation, and public feed age.
- Cleanup failures remain visible and retryable.

### R13. Quality and operations

- Default automated tests use fixtures, mock source servers, and mock providers. They make no live model or arbitrary web requests.
- Public projection fixtures seed explicit approval records; the fixture runner never auto-approves content.
- Keep the offline `ai-daily:draft` command as an emergency/manual fallback, while documenting the Studio runner as the primary workflow.
- Treat the first real end-to-end edition as a separate, user-approved business task rather than a liveness test.

## Acceptance Criteria

- [ ] A `fixture` run executes the whole pipeline with mock discovery, extraction, generation, verification, public projection, and UI data.
- [ ] A no-provider fixture proves the disaster-recovery evidence path, but is labeled `degraded` and is not accepted as production-ready.
- [ ] Production readiness fails closed when real-time discovery or quality generation capability is missing.
- [ ] Brave discovery can add URLs outside stable sources; Firecrawl or direct extraction retrieves the original page; when configured, Tavily can take over the same discovery/extract capability after a bounded primary failure. Missing fallback is visible as reduced redundancy, not a hidden condition.
- [ ] Search summaries and X posts cannot enter selected evidence without a successfully fetched authoritative page.
- [ ] Freshness fixtures enforce the 30-minute Tier 1 and 150-minute broad-discovery composition gates plus the 30-minute discovery, 15-minute review-ready, and 2-minute approval-to-public automation SLOs.
- [ ] SSRF/DNS/redirect/body/content-type/timeout fixtures block unsafe targets and preserve sanitized failure categories.
- [ ] URL/content/title duplicate fixtures collapse deterministically before semantic grouping, with visible reasons and membership.
- [ ] The baseline policy (`minScore=55`, target `8`, minimum `5`, maximum `10`, at most `2` events per domain, at most `3` per topic, at least `3` domains and `2` Tier 1 sources) produces a stable expected set and tie order.
- [ ] Extractor, composer, and verifier fixtures create schema-valid evidence bindings and fail closed on unknown or unfetched source IDs.
- [ ] A minimum 30-case quality fixture report enforces zero critical factual errors, 100% published-claim citation precision, >=98% citation coverage, >=85% minor-edit acceptance, and >=4/5 Chinese editorial quality.
- [ ] Approved flash items appear through the public read-only API within the cache window; unapproved, held, corrected-old, and withdrawn records do not.
- [ ] Correction fixtures prove immutable revisions, atomic supersession, stable public IDs, changed ETags, and immediate withdrawal behavior.
- [ ] Feed and event-detail API fixtures verify field whitelisting, versioned DTOs, CORS, rate limiting, bounded pagination, auth-middleware isolation, `404`/`410` rules, ETag, `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, and a 48-72 hour retention window.
- [ ] Public feed payloads distinguish projection generation time, last approval time, pipeline freshness, editorial coverage, and stale state.
- [ ] Lease/deadline fixtures prove slow sources and provider calls do not starve Tier 1 collection, approved manual work, or the daily composition deadline.
- [ ] One date has only one active run; retries create no duplicate issues, flash items, sources, or drafts.
- [ ] Reruns never mutate protected human drafts and expose a revision/diff only when a new composition exists.
- [ ] Desktop `1440x1000` and mobile `390x844` fixtures cover all Studio views and the public feed without unintended horizontal overflow or clipped controls.
- [ ] Exported source cards preserve title, publisher, date, URL, and evidence excerpt; legacy drafts still export safely during migration.
- [ ] Export pass is never displayed as deployed/public, and unreviewed database content remains absent from public build surfaces.
- [ ] Sensitive scans cover logs, database events, temp files, API responses, and generated output with a documented denylist and placeholder allowlist.
- [ ] Prisma, server, runner, API, export, UI, lint, build, and `git diff --check` gates pass with deterministic fixtures.
- [ ] One separately approved live edition meets freshness, source coverage, evidence, Chinese quality, and editorial review gates.

## Out Of Scope

- Unreviewed automatic public wording, daily-draft approval, Git commit/push, deployment, or social-channel push.
- Legal RAG, public/internal assistant retrieval, Operator tools, or changes to unrelated applications.
- Runtime dependence on `learn`, smart-search CLI, Zhipu, Exa, or another unconfigured local research tool.
- Automatic reuse of publisher images or long article text without a separate media/copyright policy.
- A second permanent CMS, event bus, or external queue at the current scale.

## Research References

- HotDaily product and Skill: https://linux.do/t/topic/2474361 and https://github.com/Done-0/hotdaily-skill
- NewsPrism: https://github.com/moguiyu/NewsPrism
- CondenseIt: https://github.com/wildlifechorus/condenseit
- ReadEverything: https://github.com/berleary/read-everything
- Horizon: https://github.com/Thysrael/Horizon
- Brave Search API: https://brave.com/search/api/
- Firecrawl Search and extraction: https://docs.firecrawl.dev/features/search
- Tavily Search API: https://docs.tavily.com/documentation/api-reference/endpoint/search
- xAI X Search: https://docs.x.ai/developers/tools/x-search
