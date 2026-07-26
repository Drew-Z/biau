# Evidence Register

## Label Definitions

- [source-verified] Confirmed in versioned code, tests, or a repository contract.
- [production-observed] Recorded by a production acceptance or incident artifact; scope and date still matter.
- [documented-design] Explicit design or rollout intent that may remain disabled or incomplete.
- [portfolio-claim] Public-facing summary awaiting stronger evidence.

Every row identifies a repository label, immutable commit where practical, repository-relative path, symbol or section, and the boundary of what the evidence supports.

## Chatus Evidence

| ID | Label | Repository | Commit | Path | Symbol/Section | Observation/Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| E-CHATUS-001 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Product boundary | Invitation-only member workspace with optional restricted guest; no public API proxy claim. |
| E-CHATUS-002 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Architecture overview | Worker, KV, UserState, TeamAgent, and ProviderCoordinator responsibilities. |
| E-CHATUS-003 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | src/worker.ts | Router and response projection | Public routes, Agent routes, API routes, request identity, and safe response behavior. |
| E-CHATUS-004 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Provider routing and fallback | Priority routing, concurrency modes, malformed-stream handling, and pre-visible-output fallback. |
| E-CHATUS-005 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Conversation synchronization | Editing, regeneration, branching, conflict protection, tombstones, and deletion timeline. |
| E-CHATUS-006 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Capability policy | Per-member Skills and tools are rechecked during projection and execution. |
| E-CHATUS-007 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Managed secrets and observability | Encryption, no plaintext echo, request IDs, redaction, and real-task telemetry boundary. |
| E-CHATUS-008 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | package.json | Verification scripts | Frontend, test, typecheck, browser, and deployment verification entrypoints. |
| E-CHATUS-009 | production-observed | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | .trellis/tasks/07-27-chatus-anchor-site-integration/implement.md | Production Validation Record | On 2026-07-27 the public entry followed to `/react-chat/` and returned HTTP 200; no credentialed feature acceptance was performed. |

## Anchor Evidence

| ID | Label | Repository | Commit | Path | Symbol/Section | Observation/Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| E-ANCHOR-001 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | README.md | Product and workflow | Traceable learning purpose, import-to-review flow, and local-first positioning. |
| E-ANCHOR-002 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | pubspec.yaml | Dependencies | Flutter, Riverpod, sqflite, Dio, secure storage, file, and sharing dependencies. |
| E-ANCHOR-003 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/architecture/SYSTEM_OVERVIEW.md | Traceability pipeline | Semantic chunking, locators, content hashes, citation verification, and question validation. |
| E-ANCHOR-004 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | lib/services | Agent and task services | Generation tasks, checkpoints, hybrid search, interview, evaluation, and privacy service boundaries. |
| E-ANCHOR-005 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | test | Test inventory | Service, database, Agent, privacy, evaluation, UI, and Private Alpha tests exist; not a fresh all-green claim. |
| E-ANCHOR-006 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/landing/app/scripts/data.js | Demo datasets | Three bilingual datasets, twelve questions, citations, explanations, and scripted tutor content. |
| E-ANCHOR-007 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/landing/app/scripts/app.js | Demo state contract | Locale, versioned progress, normalization, answer flow, source display, and reset. |
| E-ANCHOR-008 | production-observed | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | .trellis/tasks/07-27-chatus-anchor-site-integration/implement.md | Production Validation Record | On 2026-07-27 twelve production Playwright checks passed across desktop, tablet, and mobile; direct HTTP and deployed-asset hash checks recorded the canonical route behavior and current web parity. |
| E-ANCHOR-009 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/private-alpha-release-checklist.md | Release boundary | Android is the Private Alpha target; other platforms are not release-supported. |
| E-ANCHOR-010 | documented-design | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/architecture/SYSTEM_OVERVIEW.md | Future platform direction | Cross-platform and synchronization direction is design context, not current release proof. |
| E-ANCHOR-011 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | .github/workflows/ci.yml | Android Private Alpha and Web CI | One dependency-compatible Flutter toolchain runs format, analysis, tests, and Android release build; a separate Web job runs unit and twelve browser cases; unsupported iOS build is not claimed. |
| E-ANCHOR-012 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/tests/demo.spec.js | Complete browser regression | Twelve cases cover all bundled questions, recovery/reset, locale metadata, keyboard/ARIA, three viewports, and off-origin requests. |

## Public Assistant Evidence

| ID | Label | Repository | Commit | Path | Symbol/Section | Observation/Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| E-PA-001 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/public-research-assistant.md | Product boundary | Anonymous, read-only, public-only answer and citation contract. |
| E-PA-002 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/publicAssistantAgent.ts | runPublicAssistantAgent | LangGraph nodes, routing, parallel research, bounded retry, verification, and finalization. |
| E-PA-003 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/public-research-assistant.md | Retrieval and web evidence | Public-only hybrid retrieval and lead-to-original-page evidence promotion. |
| E-PA-004 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | functions/_shared/assistant.ts | Same-origin proxy | Request, response, stream, timeout, and cancellation bounds. |
| E-PA-005 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | src/utils/publicAssistantApi.ts | Browser API decoder | Shared JSON and SSE validation, citation filtering, and terminal stream semantics. |
| E-PA-006 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/publicAssistantPersistence.ts | Anonymous persistence | Optional database behavior, 30-day records, feedback, and long-lived low-sensitivity counters. |
| E-PA-007 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/manual-gates.md | Public assistant acceptance | Historical deployed chat, citation, persistence, feedback, and public-sync acceptance. |
| E-PA-008 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | package.json | Assistant checks | Graph, model, API, persistence, rate limit, web, sync, hybrid, service-mode, and UI commands. |
| E-PA-009 | documented-design | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | render.yaml | Service projection | Public, Studio, and RAG service separation with production flags and bindings. |

## AI Daily Evidence

| ID | Label | Repository | Commit | Path | Symbol/Section | Observation/Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| E-AID-001 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/ai-daily-pipeline.md | End-to-end pipeline | Manifest, ingestion, evidence, ranking, generation, review, Flash, and static export. |
| E-AID-002 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyIngestionRunner.ts | Durable ingestion | Work items, leases, checkpoints, conditional fetch, and recovery. |
| E-AID-003 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyGenerationRunner.ts | Generation stages | Extract, compose, verify, validate, draft, checkpoint, and lease transitions. |
| E-AID-004 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyGeneration.ts | Validation projection | Valid, editor-review, and rejected outcomes plus hidden-draft rules. |
| E-AID-005 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/ai-daily-workflow.md | Fail-closed and redaction | Feature flags, approved bundle, server-only runtime, and low-sensitivity provider failures. |
| E-AID-006 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyPublicRoutes.ts | Public feed | Approved projection, CORS, cursor, rate limit, ETag, and caching. |
| E-AID-007 | documented-design | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/ai-daily-pipeline.md | Scheduling and rollback | Intended Cron cadence and stop-schedule-before-flag/code rollback order. |
| E-AID-008 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/tasks/07-17-ai-daily-production-operations/implement.md | Extractor incident | Two approved real attempts failed at the shared Responses request boundary; no draft or public item. |
| E-AID-009 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/tasks/07-17-ai-daily-production-operations/implement.md | Diagnostic deployment | Service checks passed with production generation disabled; no provider call during deployment validation. |
| E-AID-010 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | package.json | AI Daily checks | Focused commands cover every pipeline stage, readiness, acceptance, rollback, operations, and retention. |

## Cross-Project Evidence

| ID | Label | Repository | Commit | Path | Symbol/Section | Observation/Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| E-CROSS-001 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | Shared Boundaries | Derived from E-CHATUS-002, E-ANCHOR-003, E-PA-002, and E-AID-003; compares public projections without claiming shared implementation. |
| E-CROSS-002 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | Evidence-Bound Design | Derived from E-CHATUS-004, E-ANCHOR-003, E-PA-003, and E-AID-004; contrasts session, chunk, claim, and editorial boundaries. |
| E-CROSS-003 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | Deterministic Checks | Derived from E-CHATUS-008, E-ANCHOR-005, E-PA-008, and E-AID-010; separates fixture checks from approved live calls. |
| E-CROSS-004 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | Failure And Recovery | Derived from E-CHATUS-004, E-ANCHOR-007, E-PA-002, and E-AID-002; contrasts four independently verified recovery contracts. |

## Production Observation Boundary

[production-observed] means that a scoped event was recorded: an entry responded, a production browser suite passed, an acceptance completed, or a failure occurred. It does not mean continuous availability. AI Daily's production observation is intentionally a failed generation boundary with the generation flag closed; it must never be rewritten as a successful production edition.
