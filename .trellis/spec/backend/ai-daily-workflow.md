# AI Daily Workflow Guidelines

## Scenario: Versioned source and discovery curation

### Contract

- `server/data/ai-daily-source-manifest.v1.json` is the versioned editorial candidate registry. It contains source definitions plus discovery query groups, not collected articles and not production secrets.
- Candidate manifests use `readiness: "pending-human-review"`; every entry remains `enabled: false` until a human approves production use. A public-page pre-review may move an entry from `candidate` to `hold`, `approved`, or `rejected`, but that recommendation does not change top-level readiness or enable collection.
- Top-level `readiness: "approved"` requires every source and query group to have a resolved non-candidate review, at least 12 approved sources, and at least 4 approved query groups. Held and rejected entries remain disabled; an enabled entry must always be individually approved.
- Each source is parsed through `normalizeAiDailySourceFeedDefinition`; manifest code must not duplicate canonical URL, locale, domain, cadence, or source-tier normalization rules.
- Query groups store stable discovery inputs only: id, rationale, locale, provider-neutral `queries`, provider-specific `providerQueries`, include/exclude domains, bounded provider budget, minimum primary results, signal policy, enabled flag, and review metadata. Enabled groups must provide at least two bounded The News API queries using that provider's explicit Boolean DSL; GDELT and signal adapters continue to consume provider-neutral queries. Edition windows are runtime inputs and must not be committed into the registry.
- A passing manifest check proves repository shape and recorded review metadata only. It does not prove that a URL is currently reachable, a provider is configured, or that a real edition can be published.

### Required verification

- Run `npm.cmd run ai-daily:manifest-check` after changing the manifest, parser, source-feed normalization, query budget, or review-state contract.
- The check must use local files only and cover count bounds, duplicate ids/canonical URLs, public HTTPS, canonical locale/domain, TIER_1 domain matching, provider-query presence for enabled groups, query budget bounds, include/exclude conflicts, reviewer requirements for `hold`/`approved`/`rejected`, and rejection of enabling pending candidates.
- Keep the check inside `ai-daily:contracts-check` and the script-registration list used by `ai-daily:production-readiness-check`.

## Scenario: Public AI Daily Flash Feed

### HTTP and deployment boundary

- `GET /public/ai-daily/feed` and `GET /public/ai-daily/events/:publicId` are no-token public reads mounted only by the Studio service and local `all` mode. The public assistant and RAG services must not mount these routes.
- Production Studio sets an exact browser-origin allowlist, `TRUST_PROXY=true`, a bounded public window, stale threshold, rate limit, and rate window. `TRUST_PROXY` must not be enabled by the other Render services.
- The router returns explicit CORS headers only for allowlisted origins, handles `OPTIONS`, emits bounded process-local `RateLimit-*` headers, and returns `429` plus `Retry-After` when the client-IP budget is exhausted.
- Successful responses use public cache headers, deterministic ETags, and `304` for matching `If-None-Match` without returning a body.

### Public projection contract

- Feed rows must be `ACTIVE`, have a current `APPROVED` revision, fall inside the configured approval window, and remain inside retention. Ordering and pagination use the stable `(lastApprovedAt desc, publicId desc)` keyset; limits are integers from 1 through 40, defaulting to 20.
- Detail reads return `404` for unknown, held, never-approved, or otherwise non-public ids. Withdrawn or retention-expired ids return `410` so clients can distinguish permanent removal from a missing draft.
- DTOs are explicit public whitelists. They expose only the stable public id, revision, bounded editorial text, approval/correction timestamps, and sanitized citation snapshots. Prisma records, internal ids, lifecycle audit data, stack traces, tokens, and private fields never cross this boundary.
- Citation URLs must parse as credential-free public HTTPS URLs. Local, private, metadata, LAN, malformed, and non-HTTPS targets are removed before serialization.
- Feed metadata reports page-scoped citation coverage plus `fresh`, `stale`, or `empty` projection state. A stale projection remains readable and must be labeled rather than silently treated as fresh.

### Required verification

Run `npm.cmd run ai-daily:public-feed-check` after changing the projection, router, schema, service modes, cache/CORS/rate-limit behavior, or citation contract. The deterministic check must cover field whitelisting, URL safety, pagination, `304`, `404`, `410`, `429`, stale metadata, correction ETag changes, query budget, and route isolation without connecting to providers or production databases.

## Scenario: Evidence-bound generation runner

### Durable stage contract

The generation runner is evidence-bound and provider-neutral. Its durable stages are:

```text
EXTRACT_FACTS -> COMPOSE -> VERIFY -> VALIDATE -> DRAFT
```

Each stage has one immutable `AiDailyGenerationCheckpoint` per `runId + stage`. The checkpoint stores `payloadJson`, its SHA-256 `payloadHash`, and a schema version. A replay with the same hash is idempotent; a different payload for the same stage is a hard conflict. The checkpoint is written before `AiDailyRun.currentStage` advances.

Checkpoint creation takes a PostgreSQL transaction advisory lock scoped to `runId + stage`. Only the transaction that creates the checkpoint may advance the run and append the corresponding low-sensitive `generation-checkpoint` event. Concurrent or later same-hash replays return the existing checkpoint without incrementing `eventSequence`; this exactly-once event behavior must be covered by the disposable PostgreSQL gate.

The verifier receives both the risk-classified claims and every generated composition block, including titles, summaries, impact text, and trends. Claim reviews and composition-block reviews must each be unique and complete. A missing, duplicated, contradicted, or insufficient block review fails closed, so attaching a valid claim ID to unsupported prose cannot make a revision `VALID`. Cross-event trend blocks additionally require evidence from at least two independent publisher domains.

Generation work is claimed through the existing `AiDailyWorkItem` lease. Every new checkpoint write is bound to the current lease token and expiry. An expired worker cannot advance a run; the next attempt closes the old attempt as retryable failure and resumes from the last checkpoint. Same-date run creation takes a PostgreSQL advisory lock and merges scheduled/manual triggers into the same active run.

### Revision and draft projection

The deterministic gate owns publication eligibility. `VALID` may create the first `HIDDEN + REVIEW_NEEDED` ContentDraft and one pending review. `NEEDS_EDITOR_REVIEW` creates only an immutable generated revision. `REJECTED` creates no draft. A later valid revision never updates an existing draft; it is recorded as `BLOCKED` and sets `AiDailyIssue.newEvidenceAvailable`.

Generated revisions use a unique generation key so a retry after projection cannot create a duplicate revision. Citation snapshot v2 data is copied from persisted evidence, not reconstructed from model output.

Worker projection revalidates the active work-item lease inside the same transaction that creates or reuses a generated revision. The validation reads the work-item row with `SELECT ... FOR UPDATE`, so an expired-lease reclaim cannot pass between validation and projection writes. The disposable PostgreSQL gate must hold the issue row, prove the projection transaction has reached that barrier, and confirm reclaim remains blocked until the projection transaction releases the lease row. Each revision retains its exact `projectionDraftId`; a retry after projection but before the DRAFT checkpoint must return that original draft binding rather than the issue's later mutable draft pointer.

### Command and provider boundary

The automatic checks use fixture providers only. `ai-daily:run`, `ai-daily:compose`, `ai-daily:resume`, and `ai-daily:editorial-tick` require an explicit mutually-exclusive `--fixture` or `--live` mode. `--fixture` selects `FIXTURE` work and never calls an external provider. `--live` additionally requires `AI_DAILY_PRODUCTION_GENERATION_ENABLED=true`, a server-only runtime candidate config, and a validated approved model-selection bundle from either the manual static-selection path or the optional measured-evaluation path; missing or drifting configuration fails closed. No model or search liveness request is a valid health check.

The authenticated Studio product entry is `POST /studio/api/ai-daily/issues/:id/live-run`. It requires the current issue `updatedAt`, a bounded actor, and the exact `RUN_APPROVED_PRODUCTION_EDITION` confirmation value. Before returning `202`, it revalidates the production flag, runtime/approval binding, issue version, selection authority, and at least three complete ready selected evidence records, then writes the existing durable `PRODUCTION` run/work item. It never turns on the production flag itself. A Studio-process worker polls only already-queued production work, claims it through the shared lease, reuses the same execution service as the CLI, and resumes from immutable checkpoints after restart. Multiple Studio instances remain fenced by the database lease.

The live provider boundary is the OpenAI-compatible Responses API with a structured JSON response. Every runtime channel uses `protocol: "responses"`; Chat Completions is not an AI Daily fallback. The request deliberately omits optional sampling fields such as `temperature` because relay compatibility is not guaranteed. Runtime channels carry private base URLs and keys only in deployment environment; candidate records and approval bundles retain provider/failure-domain aliases, model identifiers, aggregate quality, latency, usage summaries, and hashes, never endpoints, credentials, prompts, source text, raw outputs, or raw provider errors.

## Scenario: Bounded generation provider failure persistence

### 1. Scope / Trigger

- Trigger: a live extractor, composer, or verifier request fails and its attempt must survive a durable checkpoint without retaining raw provider data.
- Goal: preserve enough information to distinguish configuration and transport failures while keeping checkpoint and observability labels fixed and low-sensitive.

### 2. Signatures

- `classifyAiDailyGenerationProviderError(error: unknown): AiDailyGenerationProviderErrorCategory` owns provider exception projection.
- `isAiDailyGenerationProviderErrorCategory(value: unknown)` owns checkpoint restoration validation.
- `AiDailyGenerationProviderAttempt.errorCategory` is either `null` or one of `provider_error`, `provider_request_invalid`, `provider_auth`, `provider_rate_limited`, `provider_endpoint_unsupported`, `provider_upstream_error`, `provider_timeout`, `provider_network_error`, `provider_empty_response`, `provider_invalid_json`, `provider_payload_too_large`, `schema_invalid`, and `provider_quality_below_floor`.

### 3. Contracts

- Failed provider calls store only the fixed category. Checkpoints and diagnostics never retain the endpoint, response body, credential, raw exception, prompt, or model output.
- Schema and quality rejections keep their existing `schema_invalid` and `provider_quality_below_floor` categories; provider transport classification must not relabel them.
- The classifier accepts only exact adapter-owned error messages or bounded HTTP status patterns. Unknown messages collapse to `provider_error` instead of becoming dynamic labels.
- Checkpoint restoration rejects an unknown or non-string category with `ai-daily-checkpoint-schema-invalid`; it must not silently coerce old or injected values.
- Classification changes no request body, endpoint fallback rule, retry count, or provider selection behavior.

### 4. Validation & Error Matrix

- Payload bound failure -> `provider_payload_too_large`.
- Abort timeout -> `provider_timeout`; transport failure -> `provider_network_error`.
- Empty content -> `provider_empty_response`; unparseable structured JSON -> `provider_invalid_json`.
- Provider `401`/`403` -> `provider_auth`; `429` -> `provider_rate_limited`; `404`/`405` -> `provider_endpoint_unsupported`.
- Other provider `4xx` -> `provider_request_invalid`; normalized `5xx` -> `provider_upstream_error`.
- Unknown exception/message -> `provider_error`.
- Unknown restored category -> `ai-daily-checkpoint-schema-invalid` before any provider call.

### 5. Good / Base / Bad Cases

- Good: a `429` extractor failure persists as `provider_rate_limited`, exposes no response body, and the run remains resumable/auditable.
- Base: an unrecognized relay failure persists as `provider_error`; operators know the boundary failed without receiving an unsafe dynamic string.
- Bad: persist `error.message`, a URL, or a provider response as `errorCategory`, or accept an arbitrary category during checkpoint replay.

### 6. Tests Required

- `npm.cmd run ai-daily:provider-check` covers every adapter-owned category plus generic fallback without a network call.
- `npm.cmd run ai-daily:runner-check` injects an unknown checkpoint category and requires `ai-daily-checkpoint-schema-invalid`.
- Keep both checks in `npm.cmd run ai-daily:contracts-check`; run `server:build`, `lint`, `build`, `git diff --check`, and the sensitive-value scan before commit.

### 7. Wrong vs Correct

#### Wrong

```ts
attempt.errorCategory = error instanceof Error ? error.message : String(error)
```

This persists unbounded provider text and can leak endpoints or bodies into durable data and metrics.

#### Correct

```ts
attempt.errorCategory = classifyAiDailyGenerationProviderError(error)
```

The shared classifier preserves one fixed low-sensitive category, and the checkpoint decoder validates the same source-of-truth list.

## Scenario: Structured generation prompt-validator parity

### 1. Scope / Trigger

- Trigger: changing extractor, composer, or verifier output fields, enums, array bounds, ID bindings, repair instructions, or prompt text.
- Goal: keep the model-visible contract executable and identical to the runtime normalizers, so a valid Responses channel is not rejected merely because the prompt omitted a required enum or shape rule.

### 2. Signatures

- `buildAiDailyStructuredSystemPrompt(role, schemaVersion) -> string` owns the complete model-visible structured-output contract.
- `buildAiDailyStructuredOutputSchema(role) -> ResponsesJsonSchema` owns the request-level Structured Outputs contract for each role; the provider must call the shared `requestResponsesText()` boundary instead of maintaining a second raw `fetch` implementation.
- `normalizeFactExtractionOutput`, `normalizeCompositionOutput`, and `normalizeVerifierOutput` remain the authoritative runtime validators.
- `aiDailyGenerationPromptVersion` must change whenever prompt behavior or repair guidance changes.

### 3. Contracts

- The extractor prompt lists every required claim field, all `claimType` values, the `low | medium | high` uncertainty enum, boolean `directSupport`, evidence-ID ownership, and empty-array behavior.
- The composer prompt lists the 1-10 event bound, maximum six trends, every nested claim block, exact event-to-block claim binding, uncertainty enum, and URL prohibition.
- The verifier prompt lists every verdict and reason code, required review/block-review fields, ID ownership, complete non-duplicated coverage, nullable `correctedText`, and empty-array behavior.
- Repair keeps the same full system contract and adds only bounded validation issue codes plus the previous structured output; it does not change endpoint, protocol, model, or retry count.
- Responses requests must include `text.format.type=json_schema`, `strict=true`, a role-specific schema, and `additionalProperties=false` on every object. The schema mirrors the normalizer's required fields, enums, and array bounds; uniqueness and cross-record bindings remain validator responsibilities.
- The schema must stay within the provider's supported Structured Outputs subset. Do not add unsupported keywords such as `uniqueItems`, `allOf`, or `not`; an unsupported strict schema is a provider request failure, not a model-quality result.

### 4. Validation & Error Matrix

- Prompt omits a validator enum or required field -> contract test failure before deployment.
- Missing `text.format` or schema/validator drift -> `ai-daily:model-runtime-check` failure before deployment.
- Unsupported strict-schema keyword -> remove it and keep the equivalent semantic check in the normalizer; never retry the same business task with a guessed schema.
- First output violates the normalizer -> one repair call with bounded issues and previous output.
- Repaired output still violates the normalizer -> `schema_invalid`; do not silently coerce values or publish partial structures.
- Provider transport/auth/upstream failure -> preserve its fixed provider category; do not relabel it as schema drift.

### 5. Good / Base / Bad Cases

- Good: extractor sees every legal `claimType` and uncertainty value, returns valid claims, and generation advances to compose.
- Base: the first output misses a field, repair receives the validator issue and the complete contract, and the second output passes.
- Bad: validator requires `claimType=interpretation` and `uncertainty=low`, but the prompt only says “include claimType and uncertainty”; repeated schema rejection is then misdiagnosed as provider instability.

### 6. Tests Required

- `npm.cmd run ai-daily:model-runtime-check` asserts the system prompt contains representative values and bounds from all three validator contracts while provider requests remain Responses-only and omit `temperature`.
- `npm.cmd run ai-daily:provider-check` keeps the one-repair limit, schema rejection, fallback ordering, and fixed provider-error categories covered without external calls.
- Run `npm.cmd run ai-daily:contracts-check`, `npm.cmd run server:build`, `npm.cmd run lint`, and `npm.cmd run build` before deployment.

### 7. Wrong vs Correct

#### Wrong

```text
Output claimType and uncertainty.
```

This names fields but leaves the model guessing values that the validator will accept.

#### Correct

```text
claimType must be one of the exported aiDailyClaimTypes; uncertainty must be low, medium, or high.
```

The prompt imports the same exported enum source used by validation, and tests prevent future drift.

## Scenario: Studio live-run ingestion authorization

### 1. Scope / Trigger

- Trigger: due-feed and six-hour discovery idempotency place evidence for one Edition into different ingestion runs, or a new ranking version follows an older selected Edition.
- Goal: same-version incremental runs form one bounded evidence cohort, while generation is authorized by the run that made the active selection rather than whichever incremental run happened most recently.

### 2. Signatures

- Product entry: `POST /studio/api/ai-daily/issues/:id/live-run`.
- Cohort helper: `summarizeAiDailyIngestionCohort(runs)` in `server/src/aiDailyIngestionRunner.ts`.
- Authorization helper: `summarizeAiDailySelectionAuthorizationIssues(pack)` in `server/src/aiDailyStudioProduction.ts`.
- Database read: at most 48 recent `DEGRADED` runs and 480 candidates for the same `issueId + aiDailyIngestionConfigVersion`.

### 3. Contracts

- Finalization re-ranks candidate evidence across the bounded same-Edition, same-config cohort. Feed-only runs contribute Tier 1 collection checkpoints; discovery-only runs contribute broad-discovery checkpoints. Older config versions and failed runs are excluded.
- Selection remains an atomic decision owned by the current run. A representative may originate in an earlier cohort run, but it is rebound to the current persisted cluster before the Edition selection is updated.
- `loadAiDailyGenerationEvidencePack` scopes selected candidates to the Edition and projects the selected cluster's run as low-sensitive authorization metadata. Every active evidence relation must point to one `DEGRADED`, current-config, `COMPLETED` selection run.
- A later incremental run that finds no new event does not invalidate a valid current selection. Conversely, an older V5 selection cannot be authorized merely because a newer V6 maintenance run completed.
- The route returns only the existing stable `ai-daily-generation-evidence-not-ready` error plus bounded reason codes; run ids, provider payloads, endpoints, credentials, and raw database errors remain private.

### 4. Validation & Error Matrix

- Missing authority for any selected evidence -> `409 ai-daily-generation-evidence-not-ready` with `selection-ingestion-authority-missing`.
- Multiple selection decision runs -> the same error with `selection-ingestion-authority-mixed`.
- Cross-Edition or non-`DEGRADED` authority -> the same error with `selection-ingestion-authority-invalid`.
- Older config -> the same error with `selection-ingestion-config-stale`.
- Selection decision run not `COMPLETED` -> the same error with `selection-ingestion-run-not-ready`.
- Valid authority still proceeds to selected-evidence count, completeness, issue-version, production flag, and runtime-approval checks. Edition-wide readiness does not impose a fixed official-source quota; claim-level validation owns official-evidence requirements.

### 5. Good / Base / Bad Cases

- Good: one V6 run contributes discovery, a later V6 run contributes Tier 1 feeds, and current finalization ranks the combined cohort and records one selection authority.
- Base: a maintenance run completes with no new event after a valid selection; the prior completed selection authority remains valid until evidence expiry or replacement.
- Bad: a V5 selection remains on the Edition and a V6 maintenance run completes. The V6 run must not launder the V5 selection into current authorization.

### 6. Tests Required

- Run `npm.cmd run ai-daily:studio-production-check` for cohort checkpoint merge plus missing, mixed, invalid, stale, incomplete, and current authorization fixtures.
- With an explicitly configured disposable `_test` PostgreSQL database, run `npm.cmd run ai-daily:repository-check` to prove a representative from an earlier same-config run can be selected by the current run, while a foreign run remains rejected.
- Keep the check in `ai-daily:contracts-check` and in the production-readiness command inventory.
- The check is deterministic and must not access a provider, search service, deployed endpoint, or database.

### 7. Wrong vs Correct

#### Wrong

```ts
const latest = await prisma.aiDailyRun.findFirst({
  where: { issueId: issue.id, profile: 'DEGRADED' },
})
if (latest?.status === 'COMPLETED') await queueAiDailyGenerationWork(...)
```

This lets an unrelated incremental run authorize evidence it never selected.

#### Correct

```ts
const pack = await loadAiDailyGenerationEvidencePack(prisma, issue.id)
if (summarizeAiDailySelectionAuthorizationIssues(pack).length > 0) {
  throw new AiDailyStudioProductionError('ai-daily-generation-evidence-not-ready')
}
```

The persisted selection decision authorizes its exact evidence independently of later maintenance runs.

## Scenario: Manual static role selection and optional model evaluation

### 1. Scope / Trigger

- Trigger: changing extractor/composer/verifier static role mappings, AI Daily quality thresholds, evaluation case sets, runtime model channels, Responses/SSE parsing or diagnostics, provider compatibility, primary/fallback selection, production model approval, or live runner mode.
- Goal: support a truthful zero-call static mapping for the initial edition, retain measured evaluation when it adds value, and keep both approval paths tamper-evident without turning fixture checks into model liveness calls.

### 2. Signatures

- `createAiDailyEvaluationCaseSetHash(caseDescriptors)` -> stable SHA-256 hash.
- `evaluateAiDailyModelCandidate(input)` -> validated immutable candidate record or `invalid-ai-daily-model-evaluation-candidate`.
- `selectAiDailyModelEvaluation({ selectionId, generatedAt, candidates })` -> three-role pending selection record.
- `approveAiDailyModelEvaluation(selection, review)` -> approved record or `ai-daily-model-evaluation-approval-rejected`.
- Deterministic command: `npm.cmd run ai-daily:model-evaluation-check`.
- Runtime contract command: `npm.cmd run ai-daily:model-runtime-check` (loopback only, zero external calls).
- Real business command: `npm.cmd run ai-daily:model-evaluate -- --execute --approval-id <approved-run-id>`.
- Human approval command: `npm.cmd run ai-daily:model-approve -- --input <proposal.local.json> --reviewed-by <safe-id> --notes <safe-note>`.
- Manual selection command: `npm.cmd run ai-daily:model-select -- --selection-id <id> --extractor <candidate-id> --composer <candidate-id> --verifier <candidate-id> --acknowledge-reduced-redundancy`.
- Manual approval command: `npm.cmd run ai-daily:model-select-approve -- --input <selection.local.json> --reviewed-by <safe-id> --notes <safe-note> --acknowledge-reduced-redundancy`.
- Production edition command: `npm.cmd run ai-daily:run -- --date <YYYY-MM-DD> --live`.
- Response decoding: `readResponsesStreamResult(body)` and `parseStructuredResponseDetailed(text)` return content plus fixed shape diagnostics; `AiDailyGenerationProviderError.responseDiagnostics` carries only those enums into a failed attempt.
- Durable attempt fields: `responseShape`, `streamCompletion`, `lengthBucket`, and `jsonShape`, each an allowlisted literal or `null`.

Candidate input includes `candidateId`, `role`, `profile`, `providerRef`, `failureDomainRef`, `modelIdentifier`, `caseSetId`, `caseSetHash`, `caseDescriptors`, `promptVersion`, `generationSchemaVersion`, `evaluatedAt`, category/negative-tag-labeled case results, performance, and execution evidence.

### 3. Contracts

- `server/data/ai-daily-model-evaluation-cases.v1.json` is the versioned BIAU-owned golden case set. `server/src/aiDailyModelEvaluationCaseSet.ts` validates its 30 cases, six required categories, eight required negative tags, stable ids, and minimum slice coverage before an evaluation can start. The normalized complete case payload (including scenario, expected editor outcome, and expected editorial score) contributes a SHA-256 fingerprint to the role descriptor version, so changing business expectations invalidates old evaluations even if a maintainer forgets to bump the handwritten case version.
- `server/src/aiDailyModelEvaluation.ts` owns the versioned candidate, selection, and approval record contract for extractor, composer, and verifier.
- `server/src/aiDailyModelRuntime.ts` owns server-only channel/candidate configuration parsing and safe summaries; `server/src/aiDailyModelProvider.ts` owns the Responses-only structured provider adapter; `server/src/aiDailyModelProduction.ts` binds an approved selection bundle to runtime channels.
- Every candidate must use the same role-local case-set id/hash, prompt version, generation schema version, and evaluation profile. Case descriptors bind id, role/category, sorted negative tags, and the content-bound case contract version; measured results must carry the same category/tag labels. Business-evaluation descriptors must exactly match the repository golden case set. Extractor, composer, and verifier each receive role-specific challenge inputs for every declared negative tag; the evaluator aborts before recording a case if the exercised tag set differs from the case contract.
- Candidate quality reuses `evaluateAiDailyQualityReport()`. Besides global floors, every category needs at least four cases and every required negative slice needs at least three cases, zero critical factual errors, 100% citation precision, at least 90% citation coverage, and at least 80% minor-edit acceptance. A weak slice cannot be hidden by stronger global averages.
- A primary is ordered by acceptance, Chinese editorial score, citation coverage, citation precision, p95 latency, and stable candidate id.
- A fallback must independently pass every absolute quality floor, remain within 500 basis points of the primary acceptance rate, and use a different low-sensitive failure-domain alias. Multiple aliases for one outage domain must not be reported as full redundancy.
- `fixture-contract` execution evidence requires zero model calls and no result-set hash. It validates selection behavior only and makes every role approval-ineligible.
- `business-evaluation` execution evidence requires a recorded evaluation run id, evaluator version, completed case count, non-zero model-call count, and a result-set hash that exactly equals the canonical SHA-256 of the complete measured `cases` array. A format-valid but stale or substituted hash is invalid. Selection still writes `approval.status=pending`; only explicit human review may produce an approved record.
- Candidate records retain low-sensitive aliases, versions, hashes, aggregate quality, latency, and usage summaries only. The selection stores a stable `candidateSetHash` over candidate id + record hash pairs so approval remains bound to the measured record set. Do not store prompts, source text, raw outputs, endpoints, credentials, provider bodies, or raw errors.
- Evaluation, proposal, and approval records use v2 schemas for the golden-set/slice contract. The stable Render mount filename may still contain `v1`; schema validation, not the transport filename, decides compatibility. Old proposals/bundles must be regenerated and cannot be relabeled.
- Manual static-selection proposals/bundles use dedicated v2 schemas. They contain exactly one candidate per role plus low-sensitive provider/failure-domain/model identity, current `promptVersion` and `generationSchemaVersion`, fixed `manual-static-selection` semantics, explicit `reduced_redundancy`, approval state, and canonical hashes. They contain no candidate metrics, quality scores, fallback claim, endpoint, credential, prompt text, input, output, or raw error. Proposal creation and approval both require an explicit reduced-redundancy acknowledgement.
- `AI_DAILY_MODEL_RUNTIME_JSON` is server-only and uses schema `ai-daily-model-runtime-v2`. Every channel must declare `protocol: "responses"`; any other or missing protocol fails before a provider call. Channel URLs must use HTTPS in production and reject URL credentials, query strings, and fragments; local loopback HTTP is allowed only by explicit deterministic-test configuration. The static path requires one candidate per role. The optional real evaluator requires 2-3 candidates per role; full-redundancy evaluation requires at least two failure domains per role, while same-provider multi-model comparison is allowed only with the explicit `--allow-reduced-redundancy` flag and remains visibly `reduced_redundancy`.
- The Responses adapter deliberately omits `temperature`. It accepts an exact `/responses` endpoint, a `/v1` base, or a provider base that can be resolved through the two known Responses paths. Only `404` or `405` proves a guessed path is incompatible and permits trying the alternate path. Timeout, network, authentication, rate-limit, invalid response, and `5xx` failures stop immediately so one business task is not submitted twice and the original failure category is preserved.
- Real evaluation is serial and requires all three gates: `--execute`, `AI_DAILY_BUSINESS_EVALUATION_ENABLED=true`, and a command `--approval-id` equal to `AI_DAILY_MODEL_EVALUATION_APPROVAL_ID`. The default proposal path contains `.local.` and is Git-ignored.
- Production binding accepts either approved artifact family. It revalidates candidate, role, provider alias, failure-domain alias, model identifier, prompt version, generation schema version, selection/bundle hashes, and approval status against the current runtime; measured artifacts additionally revalidate candidate records. A prompt/schema drift fails before a provider or database claim. `--fixture` claims only `FIXTURE` work; `--live` claims only `PRODUCTION` work and additionally requires `AI_DAILY_PRODUCTION_GENERATION_ENABLED=true`.
- A relay `upstream_unreachable` / upstream `5xx` is a transport failure, not a model-schema rejection. If the same private Responses channel is reachable from Render but not from the relay edge, Studio may move to a direct HTTPS runtime instead of resubmitting the same task through guessed relay paths. The direct runtime keeps the real provider failure domain but receives a new `providerRef` and candidate identities; it therefore requires a new pending proposal, explicit proposal approval, bundle/Secret File/hash delivery, and a separately approved real Edition. A prior relay bundle or real-Edition approval cannot cross this transport identity change.
- A production transport-identity replacement is backup-first. Copy the current stable Secret File to a new bounded backup name, read it back, and verify both raw content identity and its canonical bundle hash before replacing the stable mount. After updating the stable file, runtime JSON, and expected hash, read back all three, keep generation/business-evaluation/public-feed disabled, deploy once, and run the offline approval check plus health/auth/route/Cron observations. These checks must make zero model calls and do not approve a real Edition.
- Studio workspace generation diagnostics are a read-only projection of existing `EXTRACT_FACTS`, `COMPOSE`, and `VERIFY` checkpoint attempts. The authenticated DTO exposes only stage, role, slot, bounded call count, fixed outcome, fixed error category, an allowlisted failure code, and the four fixed response-diagnostic literals described below. It must omit candidate/provider/model identity, endpoint, prompt, input/output, raw response, credential, and arbitrary checkpoint fields. This projection requires no migration and must never create a new model call.
- AI Daily Structured Outputs requests use Responses SSE with a fixed `max_output_tokens=8192`. The channel timeout is an inactivity budget: response headers and each accepted stream chunk re-arm it. Raw SSE transport bytes and retained structured text have separate ceilings: `MAX_RESPONSES_STREAM_BYTES=2_097_152` permits bounded reasoning/metadata envelopes, while `MAX_RESPONSES_TEXT_CHARS=64_000` still rejects oversized model content. Composer and verifier requests additionally use role-owned minimum wait floors `aiDailyComposerTimeoutFloorMs=120000` and `aiDailyVerifierTimeoutFloorMs=120000`; an explicitly larger channel timeout remains authoritative, while a smaller configured timeout cannot terminate long structured drafting/review payloads before they have a fair response window. A transport timeout changes the prompt contract and requires a fresh approval bundle before production generation can claim work; it must not be worked around by probing unapproved catalog models.
- Failed Structured Outputs attempts may additionally retain only four fixed low-sensitive response diagnostics: an allowlisted response-shape enum, stream-completion enum, bounded length bucket, and structured-JSON parse-shape enum. Legacy checkpoints restore missing fields as `null`; unknown persisted values fail checkpoint restoration, and the Studio/backend/browser boundary revalidates the same allowlists. Raw response text, arbitrary event names, exact lengths, provider identifiers, and dynamic parse errors remain forbidden. A successful attempt and non-response failure record these fields as `null`.

### 4. Validation & Error Matrix

- Invalid descriptor, duplicate case id, case membership/category/tag drift, non-canonical measured tags, business golden-set drift, or self-reported/result-set hash mismatch -> invalid candidate with a stable issue code (`business-result-set-hash-mismatch` for a business result set that is not bound to its complete measured cases).
- Missing category/negative-slice coverage or a negative slice below its quality floor -> candidate remains a valid measured record but `eligible=false` with a stable slice rejection code.
- `profile` and execution mode mismatch -> `profile-execution-mode-mismatch`.
- Fixture evidence with model calls or a result-set hash -> `fixture-model-calls-not-allowed` / `fixture-result-set-hash-not-allowed`.
- Business evidence without a model call or result-set hash -> `business-model-call-evidence-required` / `business-result-set-hash-required`.
- Tampered candidate or selection record hash -> reject before selection/approval.
- No eligible primary -> role `blockingGaps` contains `no-eligible-primary`.
- Same failure-domain fallback -> exclude it from `fallbackCandidateIds`; report reduced redundancy and `fallback-shares-primary-failure-domain` when no independent fallback remains.
- Same-provider multi-model pool without `--allow-reduced-redundancy` -> fail before any provider call with `ai-daily-<role>-independent-failure-domain-required`; with the explicit flag it is a comparison run, not a failover claim.
- Fixture selection approval -> `ai-daily-model-evaluation-approval-rejected` with `fixture-selection-cannot-be-approved`.
- Sensitive review metadata -> approval rejected with a `*-sensitive` issue.
- Missing/malformed runtime JSON, role candidate gap, duplicate id, unsafe URL, or missing key/model -> `invalid-ai-daily-model-runtime:<stable issues>` before any provider call.
- Provider `404`/`405` on a guessed path -> try the alternate known Responses path; provider `5xx`, timeout, network error, or any other HTTP failure -> stop with one low-sensitive `ai-daily-provider-*` category and do not retry a different guessed path.
- Relay-origin `upstream_unreachable` or upstream `5xx` -> persist a bounded transport category; do not report schema rejection and do not infer that a direct runtime is already healthy. A later direct-runtime proposal remains zero-call and pending until explicitly approved.
- Missing or tampered proposal/bundle fields or hashes -> stable invalid artifact error; runtime provider/failure-domain/model drift -> `ai-daily-<role>-runtime-channel-drift`.
- Unknown checkpoint stage, attempt role/slot/outcome/error category, or failure code -> drop the unknown field/entry or project the generic `generation-failure`; never reflect arbitrary persisted text to the browser.
- Missing response-diagnostic fields in a legacy attempt -> restore all four as `null`; an unknown non-null response-diagnostic value -> `ai-daily-checkpoint-schema-invalid` before any provider call.
- HTTP `200` with syntactically valid JSON but no recognized Responses or Chat Completions envelope -> `invalid_response` with `responseShape=invalid_payload`, not `empty_response`.
- Raw SSE bytes over `2_097_152` or retained structured text over `64_000` characters -> `invalid_response` with `lengthBucket=oversized`; diagnostics never retain the exact length or raw envelope.
- Approved prompt drift -> `ai-daily-model-approval-prompt-version-drift`; generation schema drift -> `ai-daily-model-approval-generation-schema-version-drift` before any provider call.
- Manual selection without either explicit acknowledgement -> `ai-daily-model-manual-selection-reduced-redundancy-acknowledgement-required`; unknown artifact fields, role-order drift, fake metrics, or a mismatched candidate role fail closed.
- No explicit runner mode, both modes, disabled production, or missing approved bundle -> fail before claiming generation work.

### 5. Good / Base / Bad Cases

- Good: each role uses the same versioned case set and records an independent primary and fallback that both pass all quality floors.
- Good: the initial edition uses one explicitly acknowledged manual candidate per role, claims no fallback or measured score, then relies on Studio review and the sealed first-edition acceptance manifest for real quality acceptance.
- Base: a role has one eligible primary but no independent fallback; selection remains visible as `reduced_redundancy` and requires human judgment.
- Bad: copy fixture metrics, change only `profile` to `business-evaluation`, and approve; execution-mode and golden-case-set validation must reject it.
- Bad: let 37 of 40 cases pass while three `scope-inflation` cases fail, then approve from the 92.5% global acceptance. The negative-slice floor must keep the candidate ineligible.
- Bad: register two candidate ids backed by the same relay failure domain and report them as full redundancy.
- Good: a base URL without `/v1` returns `404` for the first known path and succeeds on the second; exactly two loopback requests are observed.
- Base: an approved bundle is present but the runtime model identifier changed; live execution fails closed and requires a new approved model-selection artifact from either supported path.
- Good: one approved Edition records exactly one relay attempt with `provider_upstream_error`; generation is disabled immediately, and a zero-call direct-runtime proposal uses a new `providerRef` while preserving the same failure domain.
- Base: relay transport fails but direct reachability has not been proven; the direct proposal may be prepared and checked offline, but no bundle, Render update, or real call occurs before the new approval gates.
- Base: direct transport reaches the provider and persists extractor/composer/validator checkpoints, but the composer boundary returns a bounded `composer-schema-or-provider-failure`; reject/discard the revision, project no draft, disable generation, and require a new composer/provider repair before another approval.
- Good: after that rejection, deploy a zero-call Studio diagnostic projection and read the existing `COMPOSE` attempt as `failed` or `schema-rejected` before choosing a compatibility repair; no provider request is needed to classify the stored failure.
- Bad: expose the checkpoint `providerId`, model, endpoint, previous output, or raw response in Studio merely because the route is authenticated.
- Good: a truncated verifier SSE result records only `sse_output_text`, `delta_only`, `short`, and `truncated_json`, allowing operators to distinguish missing completion from malformed structured content.
- Base: an older checkpoint without those four fields resumes with null diagnostics and drops unknown fields while preserving the stable attempt category and call count.
- Good: a bounded reasoning-heavy SSE envelope larger than `512KB` but smaller than `2MiB` is discarded frame-by-frame, then the following structured output is parsed within the independent `64K` content ceiling.
- Bad: count reasoning/metadata envelope bytes against the structured-content ceiling, or raise the retained content ceiling merely because SSE wrapper overhead increased.
- Bad: persist exact response length, arbitrary SSE event names, parser exception text, or any raw response fragment as a diagnostic.
- Bad: relabel the relay bundle as direct, reuse the consumed real-Edition approval, or call the direct endpoint merely to prove liveness.
- Bad: after a `503` from the first guessed endpoint, submit the same prompt to a second guessed endpoint and finally report its `404`, hiding the original provider outage.

### 6. Tests Required

- Run `npm.cmd run ai-daily:model-evaluation-check` after changing the golden case-set asset, category/negative-tag taxonomy, slice thresholds, role selection, fallback rules, case-set hashing, evaluation records, or approval state. The check must prove that scenario/outcome/score changes alter the golden contract version, all three roles exercise every declared negative tag, and a globally passing candidate with a weak negative slice remains ineligible.
- Run `npm.cmd run ai-daily:model-runtime-check` after changing runtime channel parsing, structured request compatibility, either approval artifact family, or runner mode gates. Assert runtime v2 rejects non-Responses protocols, requests use Responses `input` rather than Chat Completions `messages`, URL credentials/query/hash rejection, no `temperature`, `404/405` compatibility fallback, no duplicate request after `5xx`, same-provider pool opt-in, both manual CLI acknowledgements, zero-call manual CLI round-trip, artifact tamper rejection, runtime drift rejection, and `externalProviderCalls=0`. Run the real evaluator only with the explicit `--execute` and approval-id gates; it is an optional business task, not a health check.
- Run `npm.cmd run studio:ai-daily-workspace-check` and `npm.cmd run assistant:service-modes-smoke` after changing Studio live-run readiness, confirmation, route isolation, or workspace projection. These checks use fixtures/missing-database boundaries only and must not call a provider.
- For a relay-to-direct transport repair, assert the pending artifact changes `providerRef` and candidate ids, preserves the real `failureDomainRef`, and remains `manual-static-selection / reduced_redundancy / modelCalls=0`; never add a direct liveness request to an automated check.
- Record only the proposal/bundle hashes, backup filename, deploy id, low-sensitive runtime counts/aliases, disabled safety flags, route status classes, Cron absence, and zero-call result. Do not record the direct base URL, API key, raw runtime JSON, Secret File contents, or provider response.
- Run `npm.cmd run studio:ai-daily-workspace-check` after changing checkpoint diagnostics. Assert the backend and browser decoders preserve the fixed attempt classification and call count while dropping provider/candidate identity, endpoint, raw response, authorization material, and unknown fields.
- Run `npm.cmd run ai-daily:model-runtime-check` after changing the AI Daily Responses transport. The loopback provider must assert `stream=true`, the fixed output-token ceiling, strict role schema, SSE structured-output decoding, a reasoning-only envelope above the former `512KB` transport limit followed by valid structured content, and `externalProviderCalls=0`.
- Responses transport fixtures must cover normal and code-fenced JSON, embedded/truncated/malformed/no-JSON results, unexpected non-SSE envelopes, delta-only streams, `output_text.done`, `response.completed`, and completion-event precedence without contacting an external provider.
- Keep every non-trivial Prisma `include` used by the Studio workspace in a named object with `satisfies Prisma.<Model>Include`. The public DTO may expose a stable alias such as `overrides`, but the database query must use the exact Prisma relation name (`editorialOverrides`). This compile-time contract prevents fixture-only DTO checks from hiding a production `Unknown field` query failure.
- Keep this command inside `ai-daily:contracts-check` and `ai-daily:production-readiness-check`. Both paths are deterministic and must report zero provider calls.
- A passing fixture contract is a repository check, not a production model approval. The static mapping still requires human approval and first-edition Studio review; optional measured candidates still require explicit real execution and human primary/fallback approval.
- Also run `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, and a sensitive-value scan before commit.

### 7. Wrong vs Correct

#### Wrong

```ts
const fallback = candidates.find((candidate) => candidate.candidateId !== primary.candidateId)
```

This can select a failed-quality candidate or another alias in the same outage domain.

#### Correct

```ts
const fallback = eligibleCandidates.find((candidate) =>
  primary.acceptanceBasisPoints - candidate.acceptanceBasisPoints <= 500 &&
  candidate.failureDomainRef !== primary.failureDomainRef,
)
```

The fallback passes the shared absolute quality floor, stays within the measured acceptance boundary, and is independent of the primary failure domain.

#### Wrong

```ts
if (failure === 'network' || failure === 'upstream-5xx') {
  continue // try another guessed URL with the same model task
}
```

This can duplicate a real generation request and replace the useful original failure with a later path error.

#### Correct

```ts
if (failure === 'http-404' || failure === 'http-405') continue
throw new Error(failure)
```

Only path incompatibility permits endpoint fallback; execution failures remain single-attempt and keep their original low-sensitive category.

#### Wrong: reuse relay approval for a direct runtime

```ts
runtime.channels[0].baseUrl = directProviderBaseUrl
await queueAiDailyGenerationWork(prisma, approvedRelayBundle)
```

This changes the transport/provider identity without human review and can silently reuse a consumed real-call approval.

#### Correct: create a new zero-call direct proposal

```ts
createAiDailyModelManualSelectionProposal({
  runtime: directRuntimeWithNewProviderRef,
  candidateIds: directCandidateIds,
  acknowledgeReducedRedundancy: true,
})
```

The proposal preserves the true failure domain but receives new provider/candidate identities. It remains pending until separately approved, delivered, and followed by a new real-Edition approval.

#### Wrong: persist provider-derived diagnostics directly

```ts
attempt.responseShape = providerPayload.type
attempt.jsonShape = error.message
```

Provider text is unbounded and can disclose response content or create dynamic durable labels.

#### Correct: project fixed adapter-owned diagnostics

```ts
attempt.responseShape = responsesResponseShapes.includes(shape) ? shape : null
attempt.jsonShape = responsesStructuredParseShapes.includes(jsonShape) ? jsonShape : null
```

The adapter owns the fixed enums, checkpoint restoration fails on injected non-null values, and Studio revalidates the same allowlists before rendering.

#### Wrong: use one ceiling for SSE transport and structured content

```ts
if (bytesRead > MAX_STRUCTURED_TEXT_CHARS) throw new Error('responses-stream-too-large')
```

This rejects a bounded response when ignored reasoning or metadata frames consume more bytes than the retained JSON text.

#### Correct: bound transport and retained content independently

```ts
if (bytesRead > MAX_RESPONSES_STREAM_BYTES) throw new Error('responses-stream-too-large')
if (content.length > MAX_RESPONSES_TEXT_CHARS) return invalidResponse('oversized')
```

The adapter permits bounded SSE overhead without weakening the smaller structured-output limit or persisting raw response data.

## Scenario: AI Daily production operations observability

### Contract

- `GET /studio/api/ai-daily/operations` and the optional Studio `/metrics` snapshot expose exactly six fixed failure categories: `config`, `provider`, `evidence`, `quality`, `infrastructure`, and `stale-content`.
- The latest-run projection is defined by immutable creation order (`createdAt DESC, id DESC`). Reconciliation, audit, or historical repair updates must not promote an older run into latest-run freshness, lag, status, or alert metrics.
- The category projection combines recent enabled-source errors (or source errors whose feed remains `DEGRADED` / `FAILING`), recent failed/retry work and failed runs, recent run events, active `NEEDS_MORE_EVIDENCE` issues, expired leases, and configured freshness-threshold breaches. Run/work/event history is bounded to 24 hours; a recovered source with only an old error is not an active category signal.
- `FAILED_CONFIG` is always classified as `config`. Known provider/auth/rate-limit/invalid-response signals map to `provider`; evidence safety/fetch/review gaps map to `evidence`; schema/quality rejections map to `quality`; timeout/network/deadline/checkpoint/lease/runner failures map to `infrastructure`; explicit or derived freshness breaches map to `stale-content`.
- Category counts are low-sensitive signal counts, not unique incidents. A single failure can leave more than one persisted signal. Unknown dynamic error strings are ignored and never become a Prometheus label.
- `biau_ai_daily_failure_signals{category="..."}` is a gauge with the fixed `category` label. Category diagnostics use `failure-<category>` codes; `config`, `provider`, and `infrastructure` are critical, while `evidence`, `quality`, and `stale-content` are warnings.
- `observability/ai-daily-grafana-dashboard.json` and `observability/ai-daily-prometheus-alerts.yml` are provider-neutral deployment artifacts. They contain no scrape URL, datasource credential, notification target, provider identity, or private endpoint. Production import, scrape authorization, and notification routing require human platform configuration.

### Required verification

- Run `npm.cmd run ai-daily:operations-check` after changing snapshot queries, category mappings, diagnostics, or metrics.
- Run `npm.cmd run ai-daily:observability-contract-check` after changing the category set, dashboard, alert rules, package scripts, or deterministic suite registration.
- Keep both checks inside `ai-daily:contracts-check`; `ai-daily:production-readiness-check` must also execute the observability asset check without network calls.
- Run `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, and a sensitive-value scan before commit.

## Scenario: Production model approval bundle delivery

### 1. Scope / Trigger

- Trigger: changing the AI Daily production model runtime, approval artifact, Render Secret File wiring, live runner configuration, or production-readiness checks.
- Goal: bind every live generation process to one human-approved, tamper-evident model selection without committing the artifact or calling a provider during readiness checks.

### 2. Signatures

- `AI_DAILY_MODEL_RUNTIME_JSON=<server-only runtime JSON>`
- `AI_DAILY_MODEL_APPROVAL_FILE=<absolute path>`
- `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<64 lowercase hex canonical bundleHash>`
- `npm.cmd run ai-daily:model-approval-check` validates delivery and prints `networkCalls: 0`.
- `npm.cmd run ai-daily:editorial-tick -- --live` and other live runner commands require the same three values before claiming `PRODUCTION` work.

### 3. Contracts

- Render uses `/etc/secrets/ai-daily-model-approval.v1.json`; local validation may use another absolute path.
- The file must pass one supported artifact schema: measured evaluation bundle v2 or manual static-selection bundle v2. Both validate current prompt/schema versions, selection record, approval status, and canonical `bundleHash`; measured bundles additionally validate candidate records. The environment hash must equal that canonical hash so an older but internally valid file is rejected.
- A validated legacy manual v1 pending proposal may be converted into a new v2 pending proposal with `ai-daily:model-select-upgrade`, which binds the current prompt/schema and requires the reduced-redundancy acknowledgement again. A legacy approved bundle is never upgraded or production-loaded; it must be replaced through a fresh explicit approval.
- Runtime candidate ids, roles, provider aliases, failure-domain aliases, and model identifiers must match the approved records. Base URLs and keys remain server-only and never enter the bundle or checker output. Checker output includes `selectionBasis` so a manual mapping cannot be mistaken for measured quality evidence.
- Render Secret Files and environment variables are service-scoped. Studio and every Editorial Cron that executes `--live` each receive their own copy of the same file/runtime/hash. Ingest Cron never receives model credentials or the approval bundle.
- The production bundle is generated locally, reviewed by a human, Git-ignored, and uploaded through Render. `render.yaml` intentionally omits Cron services until the first live edition passes its manual gate.
- On deployments without Render Shell access, Studio startup invokes `inspectAiDailyModelDelivery()` whenever any delivery value is configured. It reads only the server-side runtime JSON, absolute Secret File, and expected hash; it builds the provider binding without network/database work and logs only `networkCalls=0`, bounded counts, the canonical bundle hash, or a fixed issue category. It never enables the production worker and never logs endpoints, keys, provider responses, or raw errors.

### 4. Validation & Error Matrix

- Missing file setting -> `ai-daily-model-approval-file-not-configured` before database work.
- Relative file setting -> `ai-daily-model-approval-file-path-invalid`.
- Missing or malformed expected hash -> `ai-daily-model-approval-bundle-hash-not-configured`.
- Missing file on disk -> `ai-daily-model-approval-bundle-missing`.
- Invalid JSON -> `invalid-ai-daily-model-approval-bundle-json`.
- Invalid schema, selection, or canonical hash -> the corresponding stable `invalid-ai-daily-model-approval-*` error.
- Canonical hash differs from the configured expected hash -> `ai-daily-model-approval-bundle-drift`.
- Approved provider/failure-domain/model identity differs from runtime -> `ai-daily-<role>-runtime-channel-drift`.
- No delivery values in production readiness -> `manual-gate`; partial or configured-invalid delivery -> `fail`.

### 5. Good / Base / Bad Cases

- Good: Studio and Editorial Cron each mount the same reviewed file, use the same expected hash, and pass `ai-daily:model-approval-check` without exposing endpoint/key data.
- Good: a Shell-less Studio deployment logs `AI Daily model delivery check passed` with `networkCalls=0`, one channel, three candidates, one failure domain, and the expected bundle hash before becoming live.
- Base: a fresh clone has no real bundle; deterministic checks pass, while production readiness reports the remaining human gate.
- Bad: only Studio receives the Secret File while Editorial Cron inherits nothing and fails on its first scheduled run.
- Bad: a previous valid bundle remains mounted after the expected hash changes, or a relative repository path is used in production.

### 6. Tests Required

- `npm.cmd run ai-daily:model-runtime-check` must cover an absolute temporary file, valid checker output, missing file configuration, relative path rejection, missing hash, stale hash, malformed JSON, tampered hash, and runtime identity drift without external calls.
- `npm.cmd run ai-daily:model-runtime-check` must also exercise `inspectAiDailyModelDelivery()` with injected runtime/file/hash values, assert the ready summary and zero-call hash-drift failure, and verify that credentials/endpoints do not appear in output.
- `npm.cmd run ai-daily:production-readiness-check -- --json` must report `networkCalls: 0`, preserve an unconfigured delivery as `manual-gate`, and fail configured-invalid delivery.
- `npm.cmd run docs:deployment-check` must bind `render.yaml`, `.env.example`, deployment docs, manual gates, and this code-spec to the same path/hash/service-boundary contract.
- Run `npm.cmd run ai-daily:contracts-check`, `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, and a sensitive scan before commit.

### 7. Wrong vs Correct

#### Wrong

```text
AI_DAILY_MODEL_APPROVAL_FILE=server/data/ai-daily-model-approval.v1.json
# Secret File uploaded only to Studio; Editorial Cron is assumed to inherit it.
```

#### Correct

```text
AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json
AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<approved 64-character bundleHash>
# Upload the same reviewed file separately to Studio and Editorial Cron.
```

## Scenario: First production edition acceptance manifest

### Contract

- `server/src/aiDailyAcceptance.ts` defines the low-sensitive `ai-daily-acceptance-v3` manifest. It is an evidence index, not a replacement for human review or a production database record.
- The manifest binds one approved proposal/bundle pair from either selection path to one `PRODUCTION` edition: `selectionBasis`, `editionDate`, live `issueId`/`runId`/status, matching Studio issue/run/date and approved draft/review, matching Publish Export draft/review/version/check results, five deployment observations (`publicFeed`, `detailPage`, `etag304`, `withdrawn410`, `mobile`), and a sealed rollback-evidence reference (`evidenceId`, `recordHash`, `status=passed`).
- The manifest stores only identifiers, dates, statuses, low-sensitive command names/repository paths, hashes, and bounded check results. It must not contain prompts, source text, article body, raw model output, endpoint URLs, credentials, tokens, database URLs, or raw error responses.
- Proposal and bundle hashes, selection basis/id, and selection record are revalidated together; measured artifacts additionally bind candidate records. A mixed selection basis, fixture profile, mismatched candidate set, changed edition/run/draft version, failed export, incomplete deployment observation, old schema, or record-hash drift fails closed.
- `sealAiDailyAcceptanceManifest` writes the canonical record hash only after all six gates pass and the proposal/bundle pair plus sealed rollback evidence have been verified. The hash provides deterministic integrity, not platform attestation, operator authentication, or proof that a rollback action ran; human review remains the trust boundary. A sealed hash does not make a fixture or an unreviewed edition production-approved.

### Commands and verification

- `npm.cmd run ai-daily:rollback -- init --evidence-id <id> --recorded-by <alias> --acceptance-id <acceptance-id> --edition-date YYYY-MM-DD --issue-id <issue-id> --run-id <run-id> --reason acceptance-drill` creates the Git-ignored rollback skeleton. After the human fills its bounded preconditions/actions/preservation fields, run `ai-daily:rollback -- check`, `seal`, and `check --require-sealed`.
- `npm.cmd run ai-daily:acceptance -- init --acceptance-id <id> --edition-date YYYY-MM-DD` creates the Git-ignored local skeleton from the validated proposal and approval bundle. After the user records the live edition, Studio review, Publish Export, deployment observations, and the rollback reference, first run `ai-daily:acceptance -- check --rollback server/data/ai-daily-rollback-evidence.local.json`, then `seal --rollback server/data/ai-daily-rollback-evidence.local.json`, and finally `check --rollback server/data/ai-daily-rollback-evidence.local.json --require-sealed` to verify the final record and all six gates.
- `npm.cmd run ai-daily:acceptance-check` is a deterministic fixture/tamper regression. It must remain inside `ai-daily:contracts-check` and the production-readiness script-registration list, and it must report zero provider/network calls.
- A fresh clone without the local manifest, approval bundle, rollback evidence, or real edition remains a `manual-gate`; an existing malformed or tampered record is a repository failure. Missing rollback evidence is the only rollback-specific manual gate; malformed, unsealed, tampered, sensitive, or mismatched evidence fails closed. Local acceptance/rollback checks never call a model, search provider, production database, or deployed service.

### Required verification

- Run `npm.cmd run ai-daily:acceptance-check`, `npm.cmd run ai-daily:contracts-check`, and `npm.cmd run ai-daily:production-readiness-check` after changing the manifest, gate bindings, CLI, or readiness contract.
- Before parent-task completion, record the sealed acceptance and rollback-evidence results together with the approved model-selection artifact (manual static or measured), first live edition, Studio review/export, and public deployment checks. Do not archive the task from fixture results alone.

## Scenario: Offline AI Daily Drafts

### 1. Scope / Trigger

- Trigger: adding or changing AI Daily source inputs, draft generation commands, review gates, or future model-assisted AI Daily generation.
- Goal: keep AI Daily evidence-first, source-backed, manually reviewed, and safe for public commits.

### 2. Signatures

- `npm.cmd run ai-daily:draft -- --source <json>` reads a public-safe source JSON file and writes `content-drafts/ai-daily-<date>.md`.
- `npm.cmd run ai-daily:draft -- --source <json> --out <markdown>` writes to an explicit draft path.
- `npm.cmd run ai-daily:draft -- --source <json> --force` may overwrite an existing draft.
- Source JSON shape:
  - `date: "YYYY-MM-DD"`
  - `title?: string`
  - `subtitle?: string`
  - `editorNote?: string`
  - `items: Array<{ title, url, source, publishedAt?, summary, impact, toVerify?, tags? }>`

### 3. Contracts

- Default mode is `Codex-only scaffold/review`; generated drafts must record `model channel: none`.
- The command must not fetch URLs, call models, inspect private env files, or publish content.
- `url` must be a public `http` or `https` URL.
- `summary` and `impact` are required, author-written fields; do not copy long passages from sources.
- Draft frontmatter must include `status: "draft"`, `column: "ai-daily"`, and `modelStrategy`.
- Draft body must include evidence scaffold headings used by `blog:check`.
- First phase output is always `draft/manual-review`; automation must not claim daily publication is live.

### 4. Validation & Error Matrix

- Missing `--source` -> fail before writing.
- Missing or invalid `date` -> fail before writing.
- Empty `items` -> fail before writing.
- Invalid URL -> fail before writing.
- Missing `title`, `summary`, or `impact` on an item -> fail before writing.
- Existing output path without `--force` -> fail without overwriting.
- Model-assisted generation requested without explicit approval -> do not run.

### 5. Good / Base / Bad Cases

- Good: a source JSON with three official links generates a draft that clearly says `draft/manual-review`.
- Base: source dates are written as `source-provided` when the exact publication date still needs review.
- Bad: the source JSON contains a model relay URL, API key, internal dashboard link, or raw copied article text.
- Bad: a generated draft is promoted to public blog data without human review.

### 6. Tests Required

- Run `npm.cmd run ai-daily:draft -- --source <sample> --force`.
- Run `npm.cmd run blog:check` to verify the evidence scaffold and frontmatter.
- Run `npm.cmd run lint` and `npm.cmd run build`.
- Run `git diff --check`.
- Scan changed AI Daily files for token/key/password/base URL/private path patterns.

### 7. Wrong vs Correct

#### Wrong

```powershell
npm.cmd run ai-daily:draft -- --source .env.local
```

This points the draft generator at a private env file and risks exposing secrets.

#### Correct

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force
```

The command reads a public-safe source pack and writes a reviewable draft without model calls or publication side effects.

## Scenario: Content Studio AI Daily Issue Detail

### 1. Scope / Trigger

- Trigger: adding or changing `/studio/ai-daily/:issueId`, `/studio/api/ai-daily/issues/*`, source selection, issue brief editing, or issue-to-draft conversion.
- Goal: keep one AI Daily issue editable as an internal workflow object while public publication remains gated by hidden/review-needed drafts and static export.

### 2. Signatures

- `GET /studio/api/ai-daily/issues/:id` returns `{ issue, sources, draft }`.
- `PATCH /studio/api/ai-daily/issues/:id` accepts `{ title?, date?, status?, sourceIds?, briefJson? }`.
- `POST /studio/api/ai-daily/issues/:id/content-draft` accepts `{ editorName?: string }`.
- Frontend route: `/studio/ai-daily/:issueId`.
- Draft output from conversion:
  - `column: "ai-daily"`
  - `tag: "AI 日报"`
  - `visibility: "hidden"`
  - `status: "review-needed"`
  - `aiAssistance: "none"`

### 3. Contracts

- All routes require the Studio bearer token and the Studio database boundary through `requireStudioDatabase()`.
- `sourceIds` must reference existing `SourceItem.id` records before saving.
- `briefJson` must be a JSON object, capped by size, and must not contain secret-looking values.
- Frontend brief parsing, formatting, and field validation must go through `src/utils/studioAiDailyBrief.ts`; route components should not maintain a second page-local brief contract.
- The editorial brief fields `summary`, `publicAngle`, `keySignals`, and `toVerify` are required. Missing or wrong-typed fields are save-blocking errors; thin but correctly shaped fields are visible warnings so editors can continue incremental work.
- `/studio/ai-daily/:issueId` should preserve partial saved brief objects in the textarea and surface their validation issues instead of silently replacing them with the empty default template.
- Issue readiness is stricter than editable brief validation. Moving an issue to `review-needed`, `approved`, or `published`, or converting it to a draft, must require a substantive brief plus at least one selected public source with usable summary evidence. Normal non-review saves may keep incomplete work.
- Converting an issue to a draft must not call a model, fetch external URLs, publish content, or write Git-tracked public data.
- If an issue already links to an AI Daily draft, conversion returns the existing linked draft detail instead of creating duplicates.
- If the derived slug `ai-daily-YYYY-MM-DD` already exists for a non-AI-Daily draft, conversion must fail with `duplicate-slug`.
- The response `sources` array should be ordered according to the issue's `sourceIds`, not by database update time.

### 4. Validation & Error Matrix

- Issue not found -> `404 { error: "ai-daily-issue-not-found" }`.
- Invalid date -> `400 { error: "invalid-date" }`.
- Invalid status -> `400 { error: "invalid-ai-daily-status" }`.
- Missing source id -> `400 { error: "invalid-source-ids" }`.
- Invalid or oversized brief -> `400 { error: "invalid-brief-json" }`.
- Secret-looking payload -> `400 { error: "sensitive-content-detected" }`.
- Malformed brief textarea -> the page shows a save-blocking error before sending `PATCH`.
- Missing required brief fields -> the page shows save-blocking field errors before sending `PATCH`.
- Empty strings or empty arrays inside a correctly shaped brief -> the page shows warnings but keeps the issue editable.
- Review-ready status with thin brief, malformed brief, missing sources, invalid source URL, or no useful source summary -> `409 { error: "ai-daily-issue-not-ready", issues: [...] }`.
- Convert with no selected sources -> `409 { error: "ai-daily-issue-needs-sources" }`.
- Convert with selected but not review-ready evidence -> `409 { error: "ai-daily-issue-not-ready", issues: [...] }`.
- Duplicate derived slug -> `409 { error: "duplicate-slug" }`.

### 5. Good/Base/Bad Cases

- Good: editor opens `/studio/ai-daily/<id>`, adds three source cards, writes `summary`, `publicAngle`, `keySignals`, and `toVerify`, saves, then converts to a hidden review-needed draft.
- Good: a converted issue stores source-card blocks in `bodyJson` so the Studio draft preview and export path see the same evidence scaffold.
- Good: editor can save an incomplete `source-collected` issue, but the UI and API both block entering review until readiness errors are resolved.
- Base: a fresh issue has empty `briefJson`; the page shows a safe JSON template and waits for manual editing.
- Bad: conversion marks the draft approved, featured, published, or model-assisted without human review.
- Bad: the frontend stores or displays `STUDIO_DATABASE_URL`, `DATABASE_URL`, model provider URLs, API keys, or raw backend stack traces.

### 6. Tests Required

- Run `npm.cmd run prisma:validate` after schema or Studio route changes.
- Run `npm.cmd run server:build`, `npm.cmd run server:smoke`, and `npm.cmd run assistant:service-modes-smoke` after changing Studio API contracts.
- Run `npm.cmd run studio:ai-daily-brief-check` after changing the brief helper, issue readiness helper, or issue editing page.
- Run `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` after changing the `/studio/ai-daily/:issueId` page.
- Run `npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force` to keep the offline compatibility tool working.
- Run `git diff --check` and a sensitive scan over changed files.

### 7. Wrong vs Correct

#### Wrong

```ts
await prisma.contentDraft.create({
  data: { column: 'ai-daily', status: 'APPROVED', visibility: 'FEATURED' },
})
```

This bypasses the AI Daily review gate and can make an unreviewed issue look publish-ready.

#### Correct

```ts
await prisma.contentDraft.create({
  data: { column: 'ai-daily', status: 'REVIEW_NEEDED', visibility: 'HIDDEN', aiAssistance: 'none' },
})
```

The conversion creates an internal review draft only; public visibility still depends on human approval and static export.

## Scenario: Content Studio Local Smoke Gate

### 1. Scope / Trigger

- Trigger: adding or changing Studio export scripts, project/status detail
  planning scripts, offline AI Daily draft generation, or docs that describe
  the local content pipeline validation path.
- Goal: keep one deterministic `studio:smoke` command as the default local
  no-live gate for autonomous work and CI-style checks.

### 2. Signatures

- `npm.cmd run studio:smoke`
- The command runs:
  - `npm.cmd run studio:export -- --sample --dry-run --allow-dirty`
  - `npm.cmd run studio:project-detail-plan -- --sample legal-rag`
  - `npm.cmd run studio:status-plan -- --sample legal-rag`
  - `npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out <system-temp>/ai-daily-smoke.md --force`

### 3. Contracts

- The command must not call model providers, fetch external URLs, require a
  Studio database, require production tokens, or write public Git-tracked
  content.
- AI Daily smoke output must be written under the system temporary directory
  and removed after the command exits.
- The command must print each sub-step name before running it so failures are
  attributable.
- The AI Daily smoke draft must still contain the evidence scaffold markers:
  `column: "ai-daily"`, `status: "draft"`, `model channel: none`,
  `publication state: draft/manual-review`, and `## Review Gates`.

### 4. Validation & Error Matrix

- Any sub-command exits non-zero -> fail `studio:smoke` and report the step
  name.
- AI Daily temp draft is missing a required marker -> fail with the missing
  marker list.
- Cleanup fails because the temp directory is already gone -> ignore through
  force removal.
- Need to validate live Studio API, production database, model summary, or web
  scraping -> do not extend `studio:smoke`; create an explicit task and manual
  gate instead.

### 5. Good/Base/Bad Cases

- Good: fresh local checkout with no model keys and no Studio database passes
  `studio:smoke`.
- Base: `studio:smoke` runs while docs, scripts, or public blog data files are
  dirty and still leaves no new `content-drafts/*.md` smoke artifact.
- Bad: `studio:smoke` writes `content-drafts/ai-daily-smoke.md` or calls
  `blog:model -- doctor --live`.
- Bad: `studio:smoke` reaches out to a deployed Studio service, RSS feed,
  model relay, or arbitrary source URL.

### 6. Tests Required

- Run `npm.cmd run studio:smoke` after changing any command it wraps.
- Run `git status --short` after smoke work to confirm no temporary AI Daily
  draft was left in `content-drafts/`.
- Run `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` before
  committing script or docs changes.

### 7. Wrong vs Correct

#### Wrong

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out content-drafts/ai-daily-smoke.md --force
```

This leaves a tracked-directory smoke artifact that can be committed by
accident.

#### Correct

```powershell
npm.cmd run studio:smoke
```

The wrapper writes the AI Daily sample draft to the system temp directory,
verifies the safety markers, and cleans it up.

## Scenario: AI Daily Production Domain Foundation

### 1. Scope / Trigger

- Trigger: changing production AI Daily storage, run/work orchestration, source selection, generated revisions, flash revisions, or citation snapshots.
- Goal: preserve editorial auditability and deterministic retries while keeping legacy Studio issues readable during migration.

### 2. Signatures

- Shared domain contracts: `server/src/aiDailyDomain.ts`.
- Database ownership and transaction helpers: `server/src/aiDailyRepository.ts`.
- Deterministic fixtures: `server/src/aiDailyFixtures.ts`.
- Domain gate: `npm.cmd run studio:ai-daily-domain-check`.

### 3. Contracts

- `AiDailyIssue.status` and `sourceIdsJson` are compatibility fields. Production workflow truth uses the separate editorial state and versioned `AiDailyIssueSource` rows.
- Changed source selections must increment `selectionVersion`, preserve source order, and dual-write `sourceIdsJson` until the compatibility window closes; saving an identical ordered selection is idempotent.
- Source reads prefer the current relational selection and fall back to ordered legacy JSON only when no current relation exists.
- Canonical source promotion may update machine-owned identity/freshness fields, but must not overwrite manually edited title, publisher, tier, summary, tags, or risk flags.
- Edition identity uses a strict real calendar date. Invalid legacy date strings remain repairable records with a null `editionDate`; migrations must not silently normalize them.
- Work identity is independent of manual versus scheduled trigger. A claim requires a random lease token and expiry; completion must match both so an expired worker cannot overwrite a newer claim. A new worker may reclaim an expired lease only after closing the previous attempt as retryable failure.
- Generated content and flash content are versioned records. Flash revision content is immutable, approval history is append-only, and approval supersedes the previous approved revision in the same transaction.
- `EXPORTED` is not deployed-public truth. Public deployment remains explicit through `deployedPublicAt` or a later deployment projection.
- Citation snapshot v2 stores the original URL, canonical URL, publisher, timestamps, and a bounded evidence excerpt inside the revision/draft so later source edits cannot rewrite publication evidence.
- New domain tables are internal by default. Public selectors must opt in only after editorial approval and publication projection are implemented.

### 4. Validation & Error Matrix

- Invalid status transition -> reject with `invalid-ai-daily-transition` before writing.
- Invalid or normalized-looking calendar date -> reject with `invalid-ai-daily-edition-date` / `invalid-date`.
- Stale source selection version -> reject with `ai-daily-selection-version-conflict`.
- Missing source IDs -> reject before relation writes.
- Wrong lease token -> `lease-token-mismatch`; expired lease -> `lease-expired`.
- Duplicate logical work -> return the existing `idempotencyKey` row rather than enqueueing another trigger-specific copy.
- Citation snapshot with a private URL, malformed date, or evidence excerpt over 1 KiB -> reject as `invalid-citation-snapshot-v2`.

### 5. Good/Base/Bad Cases

- Good: a Studio brief save with unchanged source order preserves the current selection version, while an actual reorder creates a new ordered version and keeps the old rows for audit.
- Good: a worker crash leaves an expired lease; the next worker closes the old attempt as `RETRYABLE_FAILED`, receives a new token, and a stale completion is rejected.
- Base: a legacy issue has only `sourceIdsJson`; reads preserve its order until the first valid relational selection is written.
- Bad: a retry key contains `manual` or `scheduled`, creating two logical copies of the same edition work.
- Bad: generated/public content resolves citations by joining the latest mutable `SourceItem` instead of retaining citation snapshot v2.

### 6. Tests Required

- Run `npm.cmd run prisma:validate` and `npm.cmd run prisma:generate` after schema changes.
- Run `npm.cmd run studio:ai-daily-domain-check`, `npm.cmd run studio:ai-daily-brief-check`, and `npm.cmd run studio:review-policy-check` after domain changes.
- Run the full migration set against a disposable PostgreSQL database; migration changes also need a legacy-data fixture covering invalid dates, duplicate/missing source IDs, and preserved source order.
- Run `studio:ai-daily-repository-check` only with `AI_DAILY_DATABASE_CHECK=1` and a local database whose name ends in `_test`; the script must refuse deployed or non-test databases.
- Run `npm.cmd run server:build`, `npm.cmd run server:smoke`, `npm.cmd run assistant:service-modes-smoke`, `npm.cmd run lint`, and `npm.cmd run build` before commit.
- Do not call search/model providers as a schema or domain health check.

### 7. Wrong vs Correct

#### Wrong

```ts
await prisma.aiDailyWorkItem.update({
  where: { id: workItemId },
  data: { status: 'SUCCEEDED' },
})
```

This lets an expired worker overwrite a newer claim and drops attempt history.

#### Correct

```ts
await completeAiDailyWorkItem(prisma, {
  workItemId,
  leaseToken,
  result: 'succeeded',
})
```

The repository verifies the active token and expiry, records the attempt outcome, and changes work state in one transaction.

## Scenario: AI Daily Ingestion And Evidence

### 1. Scope / Trigger

- Trigger: changing source feeds, discovery orchestration, original-page extraction, evidence storage, dedupe, grouping, ranking, selection, or ingestion freshness.
- Goal: produce deterministic, selection-versioned evidence without allowing search snippets, social signals, unsafe URLs, or stale checkpoints to masquerade as publishable evidence.

### 2. Signatures

- Source registry API:
  - `GET /studio/api/ai-daily/source-feeds?enabled=true|false`
  - `POST /studio/api/ai-daily/source-feeds`
  - `PATCH /studio/api/ai-daily/source-feeds/:id`
  - `POST /studio/api/ai-daily/ingestion/refresh`
- Source payload fields: `name`, `kind`, `url`, `locale`, `tier`, `topics`, `enabled`, `intervalMinutes`, `lookbackMinutes`, `officialDomain`.
- Core modules:
  - `server/src/aiDailyIngestion.ts`
  - `server/src/aiDailyDiscoveryProviders.ts`
  - `server/src/aiDailySourceAdapters.ts`
  - `server/src/aiDailySafeFetch.ts`
  - `server/src/aiDailyIngestionRepository.ts`
  - `server/src/aiDailyIngestionService.ts`
  - `server/src/aiDailyIngestionRunner.ts`
  - `server/src/aiDailySourceManifestRepository.ts`
  - `server/src/aiDailyStudioIngestion.ts`
- Fixture gates: `npm.cmd run ai-daily:{source,discovery,discovery-provider,evidence,freshness,dedupe,ranking}-check`.
- PostgreSQL gate: `AI_DAILY_DATABASE_CHECK=1 npm.cmd run ai-daily:repository-check` against a local database whose name ends in `_test`.
  The ingestion, generation, and Studio repository checks all read
  `STUDIO_DATABASE_URL`; `DATABASE_URL` remains reserved for anonymous public
  assistant persistence.

### 3. Contracts

- Tier 1/2/3 default cadence is `15/30/60` minutes while every tier uses a 36-hour editorial lookback. Polling cadence and candidate window are independent: explicit lookback must be at least the collection interval, and omitted lookback derives the larger of the tier window and interval.
- Official RSS/Atom feeds are the highest-authority path. The News API is an optional bounded primary and GDELT DOC is its fallback; when The News API is disabled or lacks a usable token, GDELT becomes the no-key primary. Hacker News Algolia and HotDaily are signal-only. Primary failure remains visible; missing or failed fallback is `reduced_redundancy`. The News API uses `/v1/news/all`, the provider's full live/historical article-search endpoint, consumes at most `budget.maxRequests` distinct rotating `providerQueries.theNewsApi` expressions, requests at most three results per query, merges by observation identity, and caps the merged result at `budget.maxResults`; Chinese query groups request `zh,en` coverage. Its explicit `+` / `|` / parenthesized Boolean DSL is kept separate from provider-neutral query prose. It omits `categories`, because that provider field classifies the publishing source rather than the individual article and would suppress relevant AI reporting from general or business sources; curated AI queries plus original-page evidence and ranking remain the relevance boundary. GDELT `startdatetime` / `enddatetime` use its required UTC `YYYYMMDDHHMMSS` form without ISO separators or suffixes.
- AI Daily has no Tavily runtime dependency. HotDaily is public/no-key and may be disabled with `AI_DAILY_HOTDAILY_ENABLED=false`. Its adapter keeps only the original title, URL, and community source identity, routes AI-relevant titles into one query group, and discards generated summaries, reasons, scores, value lights, and trend conclusions. HN, HotDaily, and GDELT candidates remain `leadOnly` until original-page evidence is ready.
- Search and social results are candidates only. They become selectable only after original-page evidence is fetched and marked `READY`; `leadOnly` candidates cannot be promoted.
- Selection requires an explicit AI-relevance floor derived from exact title, snippet, and evidence terms plus query-group intent. Internal topic labels never count as content evidence, and substring matches such as `ai` inside `daily` are invalid. Frontier releases, open-source AI, AI infrastructure, and China release groups each require their own bounded change or domain vocabulary before a high-authority candidate may be selected.
- Safe fetch rejects URL credentials, unsupported schemes, internal hostnames, and non-public IPv4/IPv6 addresses. DNS results are checked before a pinned request, every redirect target is revalidated, and redirect destinations are checked against robots before their page is fetched.
- Direct fetch limits connect/read/total time, compressed bytes, decoded bytes, content type, redirects, and normalized evidence. Normalized text is at most `64 KiB`; citation excerpt is at most `1 KiB`; evidence expires after 30 days by default. Publication time extraction checks bounded JSON-LD `datePublished` before scripts are removed, then falls back to article metadata, itemprop metadata, and `<time datetime>`. Malformed or oversized JSON-LD is ignored rather than invalidating usable page evidence.
- A `READY` evidence document may clear `leadOnly` only when its parsed publication date falls inside the collection/discovery window that produced the candidate. An older article discovered from an undated listing remains inspectable with its real evidence date but stays ineligible for the current edition; content completeness must not override edition recency.
- The SSRF-safe Node transport pins DNS results through the `lookup` option. Because modern Node may call that callback with `options.all=true`, the pinned lookup must return an array of `{ address, family }` records in that branch and a scalar address/family pair otherwise. Returning a scalar for the array contract causes `ERR_INVALID_IP_ADDRESS` before any public source request and is projected only as `network_error`.
- Evidence documents are immutable versions per candidate. `currentEvidenceId` points to the latest version; failed writes cannot advance the version because creation and projection share a transaction.
- Manifest synchronization is idempotent and owns editorial source configuration only. It must preserve learned `ETag` and `Last-Modified` validators; a refresh must not reset them. A successful source fetch records bounded validators and the next due time, while `304` reuses the existing validator state without creating candidate evidence.
- `ai-daily:ingest-tick` and the Studio ingestion worker share the same database-backed runner. Work is claimed with the existing lease token, bounded by a deadline, and resumed after a process restart. Each tick queues due `COLLECT_FEED` work plus one idempotent `DISCOVER` item per enabled query group, six-hour time bucket, and ingestion config version; finalization waits for both kinds. If a refresh queues neither kind, the runner finalizes that empty run immediately instead of leaving an unclaimable permanent `RUNNING` record. A config-version bump permits one bounded replay in the current bucket after acquisition semantics change, while repeated refreshes on the same version remain idempotent. Because feed cadence and discovery idempotency may split one Edition across multiple runs, finalization ranks a bounded cohort of at most 48 non-failed `DEGRADED` runs and 480 candidates sharing the exact `issueId + ingestion config version`; older config versions and failed runs are excluded. A discovery item receives a 45-minute deadline: long enough to run after due official feeds and fetch bounded original pages, but still far shorter than its six-hour schedule interval. Discovery may call The News API, GDELT, HN Algolia, and HotDaily but never calls a model. Each feed fetches at most four normalized candidates and each discovery group fetches at most twelve. Discovery selection first reserves one candidate per contributing provider, then fills the remaining budget by date-bearing/lead-only priority and stable canonical key; a large GDELT response therefore cannot silently crowd HN or HotDaily out of the original-page evidence budget. Undated `leadOnly` candidates may remain for inspection but cannot satisfy selection.
- `POST /studio/api/ai-daily/ingestion/refresh` requires the existing Studio bearer token, synchronizes the approved manifest, queues due feeds, returns `202`, and wakes the worker. It does not perform a long network fetch inside the HTTP request.
- Dedupe order is canonical URL, content hash, title fingerprint, then lexical similarity. Event ranking stores named score components and stable tie-breaks. Selection may pass `targetEvents` only to satisfy minimum domain diversity and never exceeds `maxEvents`.
- Edition selection requires at least five score-qualified, original-page `READY` events across at least three publisher domains, but it does not require a fixed number of Tier 1/vendor posts. Official sources keep the highest authority score and representative priority. Release, date, price, API, availability, and explicitly official claims still require `sourceKind=official` during deterministic generation validation.
- Cross-event trend blocks require claim-bound evidence from at least two independent publisher domains. A single-source trend is rejected even when its one citation is otherwise valid.
- Tier 1 discovery P95 measures only Tier 1 candidates whose `publishedAt` is on or after the cohort's earliest `startedAt`. Feed and discovery freshness checkpoints use the newest non-null value in that same cohort. Candidates pulled from the 36-hour editorial lookback remain eligible for evidence and ranking, but they do not repeatedly fail the live-discovery SLO; collection checkpoint age and end-to-end lag continue to expose stale history separately.
- Selection writes require an explicit decision `runId` and `configVersion`; database truth must confirm every representative belongs to the same Edition/config cohort, is not lead-only, and has ready evidence. A representative from an earlier cohort run is rebound to the decision run's persisted cluster before the active Edition selection is written. Repeating the same ordered selection must not increment `selectionVersion` or duplicate issue relations.
- Source API responses expose public registry and low-sensitive health fields only. Do not persist provider credentials, endpoints, raw provider bodies, or arbitrary configuration JSON in source/evidence tables.

### 4. Validation & Error Matrix

- Invalid source payload/cadence/domain -> `400 invalid-ai-daily-source-feed` with bounded issue codes.
- Empty or invalid patch -> `400 invalid-ai-daily-source-feed-patch`.
- Missing feed -> `404 ai-daily-source-feed-not-found`.
- Canonical feed identity conflict -> `409 duplicate-ai-daily-source-feed`.
- Unsafe URL or private/DNS target -> `unsafe_url`.
- Robots denial, including a redirect destination -> `robots_disallowed` before the page request.
- Timeout/network/rate-limit/invalid provider response -> stable ingestion category; raw response and stack are not persisted.
- A Node lookup callback contract mismatch -> `network_error`; the deterministic evidence gate must exercise both `all=true` and scalar lookup forms so this does not present as a mass source outage.
- Missing primary discovery -> not ready with `primary_unavailable`; missing or failed fallback -> `reduced_redundancy`; an individual signal failure is reported with its adapter id and stable error category without suppressing other signals.
- Enabled query group without two bounded `providerQueries.theNewsApi` entries -> manifest rejection before runtime synchronization.
- Stale Tier 1/discovery checkpoints or missing selected fetch checkpoints -> explicit freshness gaps, never normal-ready.
- Selection representative outside the decision run's Edition/config cohort or without ready evidence -> `ai-daily-selection-run-boundary-mismatch` / `ai-daily-selection-requires-ready-evidence`.

### 5. Good / Base / Bad Cases

- Good: a Tier 1 RSS item is collected with conditional headers in one run, discovery contributes current signals in another same-config run, and finalization ranks their combined bounded cohort into one decision-run selection; repeating the decision reuses canonical source and issue relations.
- Good: refreshing the manifest after a prior fetch keeps the feed's validators, so the next tick sends `If-None-Match` / `If-Modified-Since`; a `304` updates freshness without discarding the stored validators.
- Good: a redirect reaches another public origin, that origin's robots policy is checked before its article request, and a denial stops extraction.
- Good: The News API receives explicit Boolean provider queries while GDELT and HN receive the provider-neutral query list from the same curated group.
- Base: The News API is disabled, so GDELT acts as the no-key primary while HN/HotDaily contribute lead-only signals; stable-source candidates remain and no provider is pinged merely to test configuration.
- Base: a repeated same-version refresh has no due work and is immediately finalized with explicit evidence gaps rather than remaining active forever.
- Bad: send `categories=tech,science` to The News API and silently exclude AI articles whose publishing source is categorized as general or business before BIAU can inspect the original evidence.
- Bad: promote a GDELT/HN/HotDaily snippet directly to `SourceItem`, persist a provider response or HotDaily-generated summary in JSON, fetch a redirect before checking its robots policy, or update a selected representative without binding the run.
- Bad: let a trusted topic label add AI relevance points, match `ai` as an arbitrary substring, or select a high-authority but unrelated article solely because its recency and information-density scores clear the total-score floor.

### 6. Tests Required

- Run all seven fixture gates and assert deterministic candidates, bounded multi-query discovery, The News API provider-DSL/date/language parameters with no source-level `categories` filter, provider-neutral fallback queries, token non-leakage, multi-signal order, HotDaily generated-field rejection, fallback attempts, evidence limits, current-run-only p95 freshness, duplicate reasons, score order, diversity, selected event count, and successful editorial-only selection with zero Tier 1 sources.
- `ai-daily:quality-check` must reject a trend block whose bound claims resolve to fewer than two independent publisher domains, while preserving the existing official-evidence rule for release/date/price/API/availability claims.
- Run `npm.cmd run ai-daily:evidence-check` to cover conditional headers, `304`, and bounded JSON-LD publication-date extraction; keep regression fixtures for JSON source payloads, relative URLs, undated/out-of-window lead handling, and the bounded date-prioritized candidate budget.
- `ai-daily:evidence-check` must also assert the pinned lookup callback returns an address array for `options.all=true` and a scalar address/family pair for the legacy branch; a local real-source smoke may be used for diagnosis, but is not part of deterministic CI.
- Type-check the AI Daily scripts explicitly because `server:build` covers `server/src` but not every `server/scripts` entry.
- Run `prisma:validate`, `prisma:generate`, and the full migration chain against a disposable PostgreSQL database.
- The PostgreSQL check must assert source/candidate upsert idempotency, evidence version increments, cluster/selection persistence, identical selection idempotency, same-Edition/same-config cross-run selection, foreign-cohort rejection, and authenticated Studio GET/POST/PATCH source routes.
- Run `server:build`, `server:smoke`, `assistant:service-modes-smoke`, `studio:smoke`, `lint`, `build`, `git diff --check`, and a sensitive-value scan.
- Automated gates must use mocks/fixtures and must not perform model, search, extraction-provider, or liveness-only calls.

### 7. Wrong vs Correct

#### Wrong

```ts
await applyAiDailyEvidenceSelection(prisma, {
  issueId,
  selected,
  selectedBy: 'runner',
})
```

This trusts in-memory representatives without proving that they belong to the active run.

#### Correct

```ts
await applyAiDailyEvidenceSelection(prisma, {
  runId,
  issueId,
  configVersion,
  selected,
  selectedBy: 'runner',
  selectionReason: 'deterministic evidence gate',
})
```

The repository verifies that selection belongs to the bounded Edition/config cohort, binds the decision to `runId`, verifies ready evidence in the database, and keeps repeated ordered selection idempotent.

#### Wrong: pinned lookup ignores Node's array form

```ts
lookup: (_hostname, _options, callback) => callback(null, address.address, address.family)
```

When Node enables `options.all`, this produces `ERR_INVALID_IP_ADDRESS` and every feed is reported as a generic `network_error`.

#### Correct: honor both lookup callback forms

```ts
lookup: (_hostname, options, callback) => {
  if (options.all) callback(null, [{ address: address.address, family: address.family }])
  else callback(null, address.address, address.family)
}
```

#### Wrong: treat HotDaily generation as evidence

```ts
return { title: item.title, originalUrl: item.url, snippet: item.summaryZh, leadOnly: false }
```

This imports another system's generated summary and value judgment into the evidence path.

#### Correct: keep only a community lead

```ts
return {
  title: item.title,
  originalUrl: item.url,
  sourceExternalId: `${item.source}:${item.externalId}`,
  snippet: null,
  leadOnly: true,
}
```

The ingestion runner fetches the original URL separately; only a dated `READY` evidence document may clear `leadOnly`.

#### Wrong: reuse provider-neutral prose and filter by source category

```ts
url.searchParams.set('search', group.queries[0]!)
url.searchParams.set('categories', 'tech,science')
```

The long prose does not express The News API's Boolean intent, while `categories` classifies the source and can remove relevant AI reporting before BIAU's own evidence and relevance checks run.

#### Correct: keep topic relevance in BIAU's evidence path

```ts
const query = group.providerQueries?.theNewsApi[0]
if (!query) throw new Error('invalid-ai-daily-source-manifest')
url.searchParams.set('search', query)
url.searchParams.set('search_fields', 'title,description,keywords')
url.searchParams.set('published_after', formatIsoSeconds(windowStart))
url.searchParams.set('published_before', formatIsoSeconds(windowEnd))
```

The adapter keeps the bounded curated query and publication window, then original-page evidence, ranking, and selection enforce the editorial quality floor.

## Scenario: Content Studio AI Daily Workspace And Flash Review

### 1. Scope / Trigger

- Trigger: the Content Studio needs one bounded view of the current AI Daily
  edition plus guarded Flash editorial actions.
- Goal: let an authenticated editor inspect runs, source health, evidence,
  Flash revisions, and edition review state, then approve/reject a draft,
  hold/release/withdraw an item, or create an immutable correction draft.

### 2. Signatures

- `GET /studio/api/ai-daily/workspace?issueId=<id>&limit=<1-40>`
- `POST /studio/api/ai-daily/flash-revisions/:id/approve`
- `POST /studio/api/ai-daily/flash-revisions/:id/reject`
- `POST /studio/api/ai-daily/flash-items/:id/hold`
- `POST /studio/api/ai-daily/flash-items/:id/release`
- `POST /studio/api/ai-daily/flash-items/:id/withdraw`
- `POST /studio/api/ai-daily/flash-items/:id/corrections`
- `POST /studio/api/ai-daily/issues/:id/content-draft`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/corrections`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/revalidate`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/apply`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/discard`
- Route registration: `server/src/studioRoutes.ts`.
- Projection and sanitization: `server/src/studioAiDailyWorkspace.ts`.
- Deterministic checks:
  - `npm.cmd run studio:ai-daily-workspace-check`
  - `npm.cmd run studio:ai-daily-flash-check`

### 3. Contracts

- Every route requires the existing Studio bearer credential and Studio
  database. The workspace `GET` remains read-only; Flash writes call repository
  methods that use the shared domain transition guards.
- The response is a bounded projection of issues, feeds, runs/events,
  work-items, candidates/evidence/clusters, flash revisions/actions, and the
  selected edition draft/review/generated-revision summaries.
- Review checklists expose only `sourceChecked`, `safetyChecked`, and
  `publicReady` booleans; unknown keys are dropped at the frontend decoder.
- Candidate ordering puts nullable scores last, then uses deterministic
  timestamp/id tie-breakers.
- The frontend must decode the payload with
  `normalizeStudioAiDailyWorkspace` before rendering. An issue switch may only
  be applied by the newest request sequence.
- The workspace does not return raw provider error bodies, raw database JSON,
  citation snapshots, stack traces, credentials, or private URLs. Edition may
  return a bounded editable content preview and bounded validation findings so
  an authenticated editor can review it; provider bodies and unbounded source
  payloads remain excluded.
- Run-event `metadataJson` remains an internal persistence field. The workspace
  may expose only a nullable `diagnostics` summary containing bounded
  `queryGroupId`, fixed `redundancy`, nullable counts (`candidates`,
  `readyEvidence`, `thinEvidence`, `fetchFailures`, `selected`), stable
  code-only `gaps`, and at most twelve provider attempts. Attempts expose only
  a fixed provider id, `primary|fallback|signal`, `succeeded|failed|skipped`,
  candidate count, and stable error category. Current provider ids are
  `the-news-api`, `gdelt-doc`, `hacker-news-algolia`, and
  `hotdaily-public-api`; an unregistered id becomes `unknown-provider`.
  Endpoint, token, raw response, request, header, and arbitrary metadata fields
  must never cross the API boundary.
- Flash approval/rejection carries `observedRevisionNumber` and
  `expectedPublicRevision`. Lifecycle actions carry `expectedPublicRevision`.
  Correction additionally carries `sourceRevisionId` and
  `expectedRevisionSequence`.
- The repository locks the Flash item row before validating versions. Approval
  atomically supersedes the previous approved revision, advances the public
  revision, and appends audit records. A held item stays held after approval.
- Withdrawal is terminal. New revisions, approval, correction, and release may
  not revive a withdrawn item.
- Correction clones the current approved revision's evidence snapshot into a
  new `DRAFT`; approved revision content is never updated in place.
- Mutation responses expose only bounded revision/item lifecycle metadata. The
  client refreshes the workspace after a successful write before reusing a
  concurrency token.
- Every Edition mutation carries `expectedIssueUpdatedAt`; the repository locks
  the issue row before comparing it. Manual draft creation uses the same
  contract rather than an unguarded legacy update. Correction idempotency keys
  are scoped by issue and source revision, and correction appends a new
  revision instead of replacing its source. A correction may only use a
  `PENDING` or `BLOCKED` source revision; applied and discarded revisions are
  terminal and reject further corrections.
- Revalidation is deterministic and provider-free. A valid revision can be
  applied only after validation; application restarts Content Studio review and
  never changes a `PUBLISHED` or `ARCHIVED` draft. `newEvidenceAvailable` is
  derived from remaining pending/blocked revisions, so applying or discarding
  an older revision cannot clear a newer revision's signal.
- Citation snapshots are normalized again when projected into a ContentDraft;
  invalid snapshots fail validation and are never copied into the draft body.

### 4. Validation & Error Matrix

- Missing Studio token -> `401 missing-studio-token`.
- Missing Studio configuration/database -> the existing stable `503` error
  contract.
- Unknown issue id -> `404 ai-daily-issue-not-found`.
- Invalid `limit` -> `400 invalid-ai-daily-workspace-limit`.
- Missing/malformed event metadata -> `diagnostics: null`; invalid attempt
  entries are dropped, an unknown non-empty provider id becomes
  `unknown-provider`, counts are clamped to non-negative bounded integers, and
  non-code gap strings are dropped.
- Invalid Flash payload -> stable `400 invalid-ai-daily-flash-*` error.
- Missing Flash item/revision -> stable `404 ai-daily-flash-*-not-found`.
- Stale version, item/revision mismatch, invalid transition, withdrawn item, or
  stale correction source -> stable `409` error; Prisma/database text is not
  returned.
- Missing or malformed Edition action body -> stable
  `400 invalid-ai-daily-generated-*`; manual draft uses
  `400 invalid-ai-daily-content-draft-action`. A stale issue timestamp ->
  `409 ai-daily-generated-issue-conflict`; applying over a changed draft ->
  `409 ai-daily-generated-revision-draft-conflict`.
- The local workspace check uses only in-process fixtures and never calls a
  model, search provider, deployed service, or liveness endpoint.

### 5. Good / Base / Bad Cases

- Good: the editor opens the workspace, switches tabs or Edition ids, sees only
  the latest response, and performs a Flash action using the displayed version
  before the workspace refreshes.
- Base: no token, empty data, or a degraded run produces a concise status or
  empty state without fabricating editorial readiness.
- Good: a completed discovery event shows whether The News API, GDELT, HN, and
  HotDaily succeeded, failed, or returned zero candidates, plus evidence/fetch
  counts and stable gaps, without exposing the request URL or credential.
- Bad: React reimplements a server transition, a stale public revision silently
  overwrites newer work, a withdrawn item is revived, an approved revision is
  edited in place, reads `metadataJson` directly, or returns raw
  provider/database details.

### 6. Tests Required

- Run `npm.cmd run studio:ai-daily-workspace-check` and
  `npm.cmd run studio:ai-daily-flash-check` after projection or transition
  fixture changes.
- The workspace check must assert that discovery/evidence counts, attempts, and
  stable gaps survive both the backend projection and frontend decoder while
  endpoint, token value, authorization, raw response, and unknown fields are
  absent from the serialized diagnostics.
- Run `npm.cmd run check:ui`; the AI Daily fixture must exercise Edition
  correction, revalidation, apply, discard, source-revision retention, and
  desktop/mobile overflow.
- With an explicitly enabled disposable local PostgreSQL `_test` database, run
  `npm.cmd run studio:ai-daily-repository-check` for transaction coverage, and
  run `npm.cmd run ai-daily:generation-repository-check` when the generation
  runner changes. Do not point these checks at production or shared databases.
- When asserting the latest `ContentReview`, order by `reviewedAt DESC, id DESC`;
  `ContentReview` has no `createdAt` column, and equal timestamps need a stable
  id tie-breaker.
- Run `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`,
  `npm.cmd run check:ui`, and `git diff --check` before commit.

### 7. Wrong vs Correct

#### Wrong

```typescript
events: run.events.map((event) => ({
  ...event,
  diagnostics: event.metadataJson,
}))
```

#### Correct

```typescript
events: run.events.map((event) => ({
  id: event.id,
  outcome: event.outcome,
  diagnostics: summarizeAiDailyRunEventDiagnostics(event.metadataJson),
}))
```

The projection helper owns the allowlist. React consumes the normalized DTO and
must not reinterpret persisted JSON.
