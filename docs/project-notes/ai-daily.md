# AI Daily Engineering Dossier

## Executive Summary

AI Daily is an evidence-first ingestion, generation, editorial, and publication system. It separates source discovery, original-page evidence, clustering and ranking, durable generation revisions, human review, Flash projection, and static daily editions. [source-verified] Evidence: E-AID-001, E-AID-002, E-AID-003.

The truthful current state is partial: production ingestion selected evidence-ready items, but two approved real generation attempts failed at the shared Responses request boundary during extraction. No generated draft or public edition was created, and the production generation flag is off. [production-observed] Evidence: E-AID-008, E-AID-009.

## Product Boundary

- Source manifests register candidates; they are not fetched articles, approvals, secrets, or proof of readiness.
- Search and community results are leads. Only successfully fetched original-page evidence can become generation input.
- Flash is a database projection of approved active items; a Daily Edition is an explicitly reviewed, Git-tracked static export.
- Internal evidence bodies, run state, review notes, and failure details do not flow directly to public pages.
- The system must fail closed when model bundle, runtime mode, feature flag, or approval state is missing or stale.

[source-verified] Evidence: E-AID-001, E-AID-004, E-AID-005.

## Architecture

The backend owns source manifests, ingestion work, leases, checkpoints, evidence records, dedupe clusters, ranking, generation revisions, Studio review, Flash actions, public projections, retention, and low-sensitivity operations snapshots. Cron is intentionally outside the initial deployment blueprint until real acceptance completes. [source-verified] Evidence: E-AID-002, E-AID-006.

Generation runs as durable stages: `EXTRACT_FACTS`, `COMPOSE`, `VERIFY`, `VALIDATE`, and `DRAFT`. Immutable revisions preserve what happened at each attempt, while a lease prevents concurrent workers from mutating the same unit of work.

## Core Implementation

- `server/src/aiDailyIngestionRunner.ts` owns durable ingestion work, leases, checkpoints, conditional fetch, and recovery.
- `server/src/aiDailyGenerationRunner.ts` advances staged generation revisions without overwriting human work.
- `server/src/aiDailyGeneration.ts` projects validation outcomes into hidden draft, editor-review, or rejection behavior.
- `server/src/aiDailyStudioProduction.ts` and `server/src/aiDailyGenerationExecution.ts` enforce feature flags, approved bundle, server runtime, and execution-time gates.
- `server/src/aiDailyPublicRoutes.ts` exposes the approved Feed/detail projection with cursor, rate-limit, ETag, CORS, and cache contracts.

[source-verified] Evidence: E-AID-002, E-AID-003, E-AID-004, E-AID-005, E-AID-006.

## Core Data Flow

1. A reviewed manifest enables eligible source definitions.
2. Discovery creates candidate leads and durable work items.
3. Original pages are fetched with conditional requests and evidence policy.
4. Freshness, dedupe, clustering, and ranking select evidence-ready items.
5. A generation runner acquires a lease and executes staged checkpoints.
6. Validation classifies the revision as `VALID`, `NEEDS_EDITOR_REVIEW`, or `REJECTED`.
7. Only `VALID` may create the first hidden review-needed draft; existing human drafts are not overwritten.
8. Editors review, correct, revalidate, apply, discard, approve, hold, release, withdraw, or export through Studio.
9. Public APIs and static editions project approved fields only.

[source-verified] Evidence: E-AID-002, E-AID-003, E-AID-004.

## Reliability And Failure Handling

Ingestion and generation both use durable work, leases, and checkpoints so a process restart does not imply starting from an unbounded scratch state. Provider failures are stored as fixed low-sensitivity categories without endpoint, credential, prompt, raw body, raw exception, or model output. [source-verified] Evidence: E-AID-002, E-AID-005.

The generation gate is checked before queuing, before worker startup, and again during execution. Rollback begins by stopping schedules and disabling generation or public-feed flags before reverting code. [source-verified] Evidence: E-AID-005, E-AID-007.

## Trade-Offs

- Durable work, leases, checkpoints, and immutable revisions add schema and operational state, but allow restart-safe processing and auditable human review.
- Human approval increases publication latency, but prevents a technically valid model response from becoming public content without editorial ownership.
- Fail-closed model approval and feature flags can leave the pipeline deliberately idle; the alternative risks unapproved models or stale configuration producing public drafts.
- Static Daily Editions are durable and reviewable in Git, while Flash provides faster database-backed updates with stronger runtime availability requirements.

[source-verified] Evidence: E-AID-002, E-AID-004, E-AID-005, E-AID-006. [documented-design] Evidence: E-AID-007.

## Security And Privacy

- Only server-side production runtime can run real generation.
- Feature flags and approved model bundles fail closed.
- Public feed routes expose approved projections with CORS, cursor, rate-limit, ETag, and cache contracts.
- Operations and incident records use bounded categories and counts rather than raw evidence, provider identity, URLs, credentials, or prompt content.
- These documentation checks never invoke a model.

[source-verified] Evidence: E-AID-004, E-AID-005, E-AID-006.

## Verification

The repository has focused checks for manifests, discovery, evidence, freshness, dedupe, ranking, repositories, providers, composition, quality, model evaluation, runtime, approval, generation, runner recovery, Studio projections, public feed, operations, retention, rollback, observability, contracts, and production readiness. Most are deterministic fixtures and do not prove a real edition was generated. [source-verified] Evidence: E-AID-010.

## Delivery Status

Production ingestion reached an evidence-ready selection. Two separately approved extraction attempts made one bounded provider call each and both returned the same low-sensitivity `provider_error` at the shared Responses boundary. Changing the selected model bundle did not move the failure point. No generated revision was promoted to a draft, nothing was published, and production generation was disabled again. [production-observed] Evidence: E-AID-008.

A diagnostic build was deployed and its service and workspace checks were healthy while generation remained disabled. That proves the diagnostic deployment path, not the generation path. The next real provider call still requires explicit owner approval. [production-observed] Evidence: E-AID-009.

## Code Entrypoints

- Durable ingestion: `server/src/aiDailyIngestionRunner.ts`.
- Durable generation: `server/src/aiDailyGenerationRunner.ts` and `server/src/aiDailyGeneration.ts`.
- Production readiness and execution gates: `server/src/aiDailyStudioProduction.ts` and `server/src/aiDailyGenerationExecution.ts`.
- Public Feed/detail API: `server/src/aiDailyPublicRoutes.ts`.
- Pipeline and operator contract: `docs/ai-daily-pipeline.md` and `.trellis/spec/backend/ai-daily-workflow.md`.
- Focused validation entrypoints: AI Daily scripts in `package.json`.

[source-verified] Evidence: E-AID-001, E-AID-002, E-AID-003, E-AID-005, E-AID-006, E-AID-010.

## Evidence

Primary evidence: E-AID-001 through E-AID-010. Incident statements intentionally omit run IDs, service IDs, source URLs, provider identity, prompt content, and raw errors.

## Interview Focus

Expect questions about lead-to-evidence promotion, durable work and leases, immutable revisions, staged generation, fail-closed configuration, human approval, Flash versus static editions, low-sensitivity failure taxonomy, rollback ordering, and how to communicate a production failure without overstating readiness.
