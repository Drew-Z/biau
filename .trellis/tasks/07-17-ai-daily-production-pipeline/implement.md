# AI Daily production pipeline implementation plan

## Strategy

Implement final product boundaries from the start: rolling approved feed plus daily deep edition, production-required discovery and generation capabilities, and provider-neutral adapters.

Build every slice with deterministic fixtures first. Do not perform live search, extraction, or model calls until the user approves one real AI Daily business run.

## Child Task Order

1. `07-17-ai-daily-domain-foundation`
2. `07-17-ai-daily-ingestion-evidence`
3. `07-17-ai-daily-generation-runner`
4. `07-17-ai-daily-studio-editorial`
5. `07-17-ai-daily-public-feed`
6. `07-17-ai-daily-production-operations`

The dependency rules are repeated inside every child artifact. Parent status remains planning until child planning validation is complete.

## 1. Domain contracts and schema

- [ ] Define `fixture`, `degraded`, and `production` profiles and readiness rules.
- [ ] Define run stage/outcome, issue state, flash approval state, evidence, freshness, ranking, provider attempt, generation-role, quality-gate, and sanitized-error contracts.
- [ ] Add Prisma models for source feeds, runs, run events, candidates, clusters, ordered issue sources, generated revisions, logical flash items, immutable flash revisions, and approval history.
- [ ] Add canonical source identity and candidate observation provenance.
- [ ] Add edition-date uniqueness, run-attempt history, selection versioning, and state transition services shared by runner/routes/tests.
- [ ] Extend source-card blocks with versioned public citation snapshots while keeping legacy draft export safe.
- [ ] Add a non-destructive Studio database migration.

Validation:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run studio:review-policy-check
```

## 2. Source registry and stable adapters

- [ ] Add Studio CRUD/contracts for RSS/Atom, official page, GitHub Releases, Hacker News API, and manual URLs.
- [ ] Implement adapter dispatch and one normalized candidate contract.
- [ ] Add 15/30/60-minute cadence classes, overlap lookback, `nextDueAt`, source health, lag, and sanitized errors.
- [ ] Seed a public-safe 30-80 source starter registry organized by tier, locale, and topic.
- [ ] Add deterministic RSS/API fixtures and malformed, delayed, duplicate, slow, and failing source cases.

Validation:

```powershell
npm.cmd run ai-daily:source-check
npm.cmd run server:build
```

## 3. Real-time discovery adapters

- [ ] Define the provider-neutral `DiscoveryProvider` and query-group contracts.
- [ ] Implement Brave Search API as the recommended primary adapter with freshness, locale, domain, result, timeout, and budget controls.
- [ ] Implement Tavily Search as the same-capability fallback with news/date filters.
- [ ] Add the optional xAI X Search signal adapter behind an explicit feature flag and approved-handle/query configuration.
- [ ] Ensure signal results are leads only and cannot satisfy evidence gates.
- [ ] Add bounded fallback rules for timeout, rate limit, network error, invalid response, low coverage, and auth/config failure.
- [ ] Add deterministic mocks for success, empty results, fallback, rate limit, stale results, invalid URLs, and partial coverage.
- [ ] Add production readiness validation that fails closed when the required primary discovery capability is not configured.
- [ ] Treat a missing fallback as visible `reduced_redundancy`; require a healthy primary capability but do not make all three external vendors a configuration prerequisite.

Validation:

```powershell
npm.cmd run ai-daily:discovery-check
npm.cmd run ai-daily:provider-check
```

## 4. Safe extraction and evidence

- [ ] Implement URL/credential/scheme validation, IPv4/IPv6 private-range rejection, DNS validation, and pinned lookup.
- [ ] Revalidate redirects and enforce redirect, body, content-type, connect, read, and total time limits.
- [ ] Honor robots/source opt-out and store stable failure categories.
- [ ] Implement normalized direct HTTP extraction for compatible pages.
- [ ] Implement Firecrawl as the selected-page and difficult-page extraction adapter.
- [ ] Implement Tavily Extract as fallback when configured.
- [ ] Normalize every extractor into the same bounded evidence document; never persist raw provider bodies.
- [ ] Store freshness checkpoints and 30-day evidence expiry.
- [ ] Add fixtures for SSRF, rebinding-shaped DNS, redirects, compression/oversize, wrong content type, timeout, robots, JavaScript pages, provider fallback, and stale evidence.

Validation:

```powershell
npm.cmd run ai-daily:evidence-check
npm.cmd run ai-daily:freshness-check
```

## 5. Dedupe, grouping, ranking, and promotion

- [ ] Implement canonical URL, content hash, title fingerprint, and lexical duplicate stages.
- [ ] Define `EmbeddingProvider`; add a mock adapter and deterministic degraded fallback.
- [ ] Preserve representative/member relations and editor merge/split overrides.
- [ ] Implement named ranking components, source/topic caps, and novelty against recent editions.
- [ ] Implement the deterministic selector, stable tie-breaking, freshness/evidence diversity gates, selection versioning, and editor override reasons.
- [ ] Promote selected observations into canonical `SourceItem` rows transactionally while preserving human fields.
- [ ] Rebuild ordered issue-source relations and persist an evidence-ready brief.

Validation:

```powershell
npm.cmd run ai-daily:dedupe-check
npm.cmd run ai-daily:ranking-check
```

## 6. Evidence-bound generation and quality evaluation

- [ ] Define extractor, composer, and verifier provider roles with primary/fallback slots.
- [ ] Implement one structured OpenAI-compatible adapter boundary that can be instantiated per role without coupling the domain to one vendor.
- [ ] Implement the atomic evidence/claim schema and one bounded schema-repair attempt.
- [ ] Batch extractor input by token and candidate limits.
- [ ] Ensure the composer receives validated fact cards only and cannot use an unrestricted search tool.
- [ ] Implement risk classification and an independent verifier step for numeric, date, price, policy, availability, security, headline, single-source, and correction claims.
- [ ] Add deterministic citation, Tier 1 attribution, generated-URL, duplication, sensational-wording, and verifier-verdict gates.
- [ ] Distinguish evidence hard failures from editable quality findings: hard failures may cause `NEEDS_MORE_EVIDENCE`; non-critical findings create an immutable `NEEDS_EDITOR_REVIEW` generated revision.
- [ ] Persist role, model, prompt/schema version, selection version, latency, usage, fallback, and sanitized outcome.
- [ ] Add a BIAU offline evaluation dataset and scoring rubric for fidelity, citations, Chinese readability, information density, title restraint, fact/opinion separation, uncertainty, and duplication.
- [ ] Seed at least 30 evidence-labeled evaluation cases and enforce: zero critical factual errors, 100% published-claim citation precision, >=98% citation coverage, >=85% minor-edit acceptance, and >=4/5 average Chinese editorial score.
- [ ] Prevent a fallback model below the configured composer/verifier quality floor from reporting normal success.
- [ ] Target 4-7 batched calls per normal edition in the orchestration contract.

Validation:

```powershell
npm.cmd run ai-daily:composition-check
npm.cmd run ai-daily:quality-check
```

## 7. Durable runner and freshness SLO

- [ ] Implement `ingest-tick`, `editorial-tick`, `collect`, `discover`, `compose`, `run`, and `resume` commands.
- [ ] Claim editions with an advisory lock, unique date, active-run check, and separate attempt history.
- [ ] Persist each stage before advancing and resume from durable checkpoints.
- [ ] Let `ingest-tick` process source, discovery, and evidence work; let `editorial-tick` process generation, flash refreshes, approved manual runs, and daily editions.
- [ ] Add idempotent work keys, claim leases, bounded tick deadlines, persisted continuation cursors, and explicit priority so slow work cannot starve Tier 1 collection or the daily deadline.
- [ ] Enforce Tier 1 age <= 30 minutes and broad discovery age <= 150 minutes before production composition.
- [ ] Record and enforce publication-to-discovery p95 <=30 minutes, successful-evidence-to-review-ready p95 <=15 minutes, and approval-to-public p95 <=2 minutes.
- [ ] Keep run status, run stage, issue state, flash approval state, and generated artifacts separate; test every mapping.
- [ ] Return `FAILED_CONFIG` for missing production capabilities and `COMPLETED_WITH_GAPS` for stale or insufficient evidence.
- [ ] Create the first hidden review-needed draft only after valid composition and quality gates.
- [ ] Add Edition actions to correct a `NEEDS_EDITOR_REVIEW` structured revision, rerun deterministic validation, persist a new `VALID` revision, and only then promote it to a draft.
- [ ] Add an explicit editor-only evidence-to-`manual`-draft transition from `EVIDENCE_READY` to `REVIEW_NEEDED`, bound to a selection version.
- [ ] Never overwrite a linked draft; require optimistic-lock application of later revisions.
- [ ] Add evidence/event retention cleanup and visible retryable cleanup failures.

Validation:

```powershell
npm.cmd run ai-daily:runner-check
npm.cmd run ai-daily:freshness-check
npm.cmd run server:smoke
npm.cmd run studio:smoke
```

## 8. Studio API and editorial UI

- [ ] Add authenticated source, run, candidate/event, flash-review, edition, and generated-revision endpoints.
- [ ] Use optimistic version checks for editor actions.
- [ ] Add the AI Daily Operations workspace with Runs, Sources, Candidates/Events, Flash Review, and Edition views.
- [ ] Show collection/discovery funnels, freshness, evidence preview, duplicate/group reasons, score components, citations, verifier results, unresolved checks, and sanitized errors.
- [ ] Support include/exclude/reorder/merge/split/request-evidence, retry/cancel, manual queue, flash approve/hold/correct/withdraw, and evidence-to-draft actions.
- [ ] Implement correction as a new immutable flash revision; approval atomically supersedes the old approved revision under the stable public ID and updates the ETag.
- [ ] Add generated-revision versus current-draft diff and protected apply flow.
- [ ] Add public-preview visibility so editors can see exactly what an approved flash exposes.
- [ ] Verify responsive layouts, loading/empty/error states, long text wrapping, and touch-safe controls.
- [ ] Add `1440x1000` and `390x844` assertions for overflow, clipped controls, long commands, evidence text, cards, and tables.

Validation:

```powershell
npm.cmd run server:smoke
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:ai-daily-flash-check
npm.cmd run check:ui
npm.cmd run lint
npm.cmd run build
```

## 9. Public rolling feed

- [ ] Add `GET /public/ai-daily/feed` and `GET /public/ai-daily/events/:publicId` to the existing Studio service.
- [ ] Project only approved field-whitelisted flash records and citation metadata.
- [ ] Define versioned feed and event-detail DTOs with the same public item field whitelist.
- [ ] Add bounded cursor pagination, maximum `limit`, 48-72 hour retention, deterministic ordering, ETag, and `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- [ ] Add configured CORS allowlist, application/CDN rate limits, indexed query budget, and tests isolating public routes from Studio authentication middleware.
- [ ] Return `404` for unknown/never-approved IDs, `410` for withdrawn/expired IDs, and the current approved revision for a stable superseded public ID.
- [ ] Expose `projectionGeneratedAt`, `pipelineFreshnessAt`, `lastApprovedAt`, `editorialCoverage`, and `stale`.
- [ ] Add the BIAU public feed UI with freshness/coverage state, loading/error/stale states, source links, correction indicators, and no horizontal mobile overflow.
- [ ] Refresh at most every 60 seconds while the page is visible; pause in background tabs and retain the last successful payload on failure.
- [ ] Prove candidates, evidence bodies, provider data, prompts, internal IDs, held items, and withdrawn items never appear publicly.

Validation:

```powershell
npm.cmd run ai-daily:public-feed-check
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```

## 10. Daily publication consistency

- [ ] Keep draft review as the only daily-edition approval authority.
- [ ] Preserve versioned citation snapshots in static export.
- [ ] Derive issue `EXPORTED` only from accepted Publish Export results.
- [ ] Never present `EXPORTED` as deployed/public.
- [ ] Prove hidden evidence, issues, drafts, and unapproved flash items remain absent from public selectors, assistant indexes, sitemap, and build output.

Validation:

```powershell
npm.cmd run studio:review-policy-check
npm.cmd run studio:export -- --sample --dry-run
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
```

## 11. Deployment, docs, and operations

- [ ] Add build/run commands for separate ingest and editorial Render Cron Jobs, UTC schedules, application timezone, required database variables, discovery/extraction slots, generation-role slots, and public-feed flag.
- [ ] Schedule `ai-daily:ingest-tick` frequently enough to honor the 15-minute Tier 1 cadence and `ai-daily:editorial-tick` frequently enough for the review-ready and composition deadlines.
- [ ] Add a mock end-to-end `ai-daily:smoke` covering all external capability slots.
- [ ] Seed explicit approved flash fixtures for public API tests; never let the fixture runner auto-approve.
- [ ] Add explicit production-readiness configuration checks without network calls.
- [ ] Add low-cardinality metrics and Studio diagnostics for freshness, coverage, provider fallback, quality rejection, and feed age.
- [ ] Update AI Daily pipeline, Studio readiness, deployment, manual gates, `.env.example`, and backend specs.
- [ ] Document the initial source registry, tier policy, query groups, cadence, fallback rules, retention, error classes, and rollback.
- [ ] Add deterministic matrices for source collisions, same-date races, missing production capabilities, stale checkpoints, fallback selection, protected revisions, flash approval visibility, citation export, retention, and sensitive scanning.
- [ ] Document the sensitive denylist and placeholder allowlist used across logs, database events, temp artifacts, API responses, and generated output.

## 12. Full quality gate

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:ai-daily-flash-check
npm.cmd run studio:review-policy-check
npm.cmd run studio:smoke
npm.cmd run ai-daily:source-check
npm.cmd run ai-daily:discovery-check
npm.cmd run ai-daily:evidence-check
npm.cmd run ai-daily:freshness-check
npm.cmd run ai-daily:dedupe-check
npm.cmd run ai-daily:ranking-check
npm.cmd run ai-daily:provider-check
npm.cmd run ai-daily:composition-check
npm.cmd run ai-daily:quality-check
npm.cmd run ai-daily:runner-check
npm.cmd run ai-daily:public-feed-check
npm.cmd run ai-daily:smoke
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

Run a sensitive scan over changed files and confirm `.codex-patch-test` remains untouched and untracked.

## 13. Manual production gates

1. Review and approve the initial curated source registry and topic/query groups.
2. Create/configure Brave Search API and Firecrawl credentials. Configure Tavily as the recommended search/extract fallback; xAI X Search remains optional.
3. Choose extractor, composer, and verifier models using the BIAU offline evaluation report; configure primary/fallback slots.
4. Configure the ingest and editorial Render Cron Job database variables, schedules, timezone, provider variables, deadlines, and public-feed base URL/flag.
5. Approve one real AI Daily edition as a business task. This is the first live provider use, not a ping.
6. Review freshness, coverage, facts, dates, citations, excerpts, verifier findings, and Chinese editorial quality in Studio.
7. Approve selected flash cards and verify the public feed projection/cache behavior.
8. Approve the hidden daily draft, create Publish Export, run local export checks, and inspect the Git diff.
9. Enable recurring production scheduling after the live acceptance edition passes.

No live provider call occurs before gate 5.
