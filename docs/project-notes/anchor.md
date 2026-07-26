# Anchor Learning Engineering Dossier

## Executive Summary

Anchor Learning is a Flutter learning assistant that turns technical documents and code into traceable knowledge and practice. Its defining contract is not “AI generated a quiz,” but “the learner can inspect the source chunk, locator, explanation, and validation boundary behind the quiz.” [source-verified] Evidence: E-ANCHOR-001, E-ANCHOR-003.

The public web surface is a separate static guided Demo. It provides three bilingual datasets and twelve questions with progress recovery, citations, excerpts, and scripted tutor hints. It does not upload files, call a backend, run analytics, or invoke a model. [source-verified] Evidence: E-ANCHOR-006, E-ANCHOR-007.

## Product Boundary

- The Flutter client is the full product direction; Android Private Alpha is the currently supported release surface.
- The browser Demo demonstrates the source-evidence loop with bundled Flutter, Git, and JavaScript material.
- The Demo does not claim Flutter Web parity, project import, login, cloud sync, real-time AI, or production model evaluation.
- Persistent package IDs, database names, secure-storage prefixes, and environment names retain compatibility identifiers after the local folder rename.

[source-verified] Evidence: E-ANCHOR-001, E-ANCHOR-002, E-ANCHOR-009.

## Architecture

The client uses Flutter and Riverpod for UI/state boundaries, sqflite repositories for local SQLite persistence, Dio for network-capable services, and task-oriented AI service modules. Domain data covers sources, source chunks, knowledge points, questions, learning sessions, checkpoints, evaluation, privacy export, and release evidence. [source-verified] Evidence: E-ANCHOR-002, E-ANCHOR-004.

The generation and grounding chain is split into explicit tasks: knowledge extraction, prerequisite mapping, question generation, citation verification, and question validation. This makes it possible to test a failed citation independently from an invalid answer rather than treating model output as one opaque blob.

## Core Implementation

- `lib/main.dart` owns application startup and the first-run gate; feature modules under `lib/features/` own learning, deck, Agent, knowledge-base, profile, and ingestion surfaces.
- `lib/data/` owns models, repositories, the sqflite database helper, and deterministic demo seeding.
- `lib/services/` owns ingestion, generation tasks, Agent runtime, evaluation, privacy, release, and scheduling boundaries.
- `web/landing/app/scripts/data.js` defines the bundled `Dataset -> Question -> Options -> Explanation -> Citations -> TutorHints` contract.
- `web/landing/app/scripts/app.js` owns locale-aware rendering, answer flow, `anchor.demo.progress.v1` normalization, recovery, completion, and reset.

[source-verified] Evidence: E-ANCHOR-002, E-ANCHOR-004, E-ANCHOR-006, E-ANCHOR-007.

## Core Data Flow

1. Import selects supported document or code sources.
2. Content hashes detect unchanged or updated material.
3. `SemanticChunker` preserves structural boundaries and emits stable locators.
4. Extraction and prerequisite tasks build learning concepts.
5. Question generation produces a candidate with cited chunk identifiers.
6. Citation verification checks that references exist and contain supporting material.
7. Question validation checks answer consistency against the evidence.
8. Accepted material enters the local repository and learning runtime.
9. Hybrid search and checkpoints support longer tutoring or interview sessions.

[source-verified] Evidence: E-ANCHOR-003, E-ANCHOR-004.

## Reliability And Failure Handling

Traceability is preserved as data: chunk identifier, locator, content hash, cited excerpts, and validation state. A failed validation remains an inspectable failure instead of being silently promoted to a trusted question. Checkpoints make long sessions resumable, while repository boundaries keep partial UI state separate from durable learning records. [source-verified] Evidence: E-ANCHOR-003, E-ANCHOR-004.

The browser Demo validates and normalizes `anchor.demo.progress.v1`. Unknown datasets, invalid options, stale versions, or out-of-range indexes are discarded or clamped. Locale is shared through `anchor.locale`, with browser-language fallback and synchronized document metadata. [source-verified] Evidence: E-ANCHOR-006, E-ANCHOR-007.

## Trade-Offs

- Local-first sqflite persistence improves privacy and offline continuity, but makes schema migration, backup compatibility, and eventual multi-device conflict handling explicit product work.
- Structure-aware chunking and two validation gates add latency and can reject otherwise fluent model output; the alternative is faster generation with weaker source support.
- A static browser Demo is deterministic, inexpensive, and safe to expose publicly, but cannot demonstrate import, model execution, cloud sync, or full Flutter behavior.
- Preserving application IDs, database names, secure-storage prefixes, and export identifiers avoids breaking existing installs, but leaves historical names that must be documented during the rebrand.

[source-verified] Evidence: E-ANCHOR-003, E-ANCHOR-007, E-ANCHOR-009.

## Security And Privacy

- Client learning data is local-first; export, deletion, support bundle, and credential storage have dedicated service boundaries.
- The browser Demo contains only bundled source excerpts and stores only locale and Demo progress.
- Its response policy blocks external connections, and `no-transform` prevents the hosting edge from injecting analytics code.
- Public project screenshots contain only built-in teaching fixtures.

[source-verified] Evidence: E-ANCHOR-005, E-ANCHOR-007.

## Verification

The Flutter repository contains broad service, database, Agent, evaluation, privacy, first-run, and Private Alpha tests. The release workflow is consolidated on a dependency-compatible Flutter toolchain and keeps the build target aligned with Android Private Alpha; repository test inventory still must not be confused with a production mobile acceptance. [source-verified] Evidence: E-ANCHOR-005, E-ANCHOR-011.

The web slice has five deterministic data/state tests and twelve Playwright cases across desktop, tablet, and mobile. The expanded suite completes all twelve bundled questions and covers locale/metadata, citations, scripted tutor disclosure, completion, malformed-state recovery, persistence/reset, keyboard and ARIA state, overflow, nonblank screenshots, and zero off-origin requests. The same twelve cases passed against production. [source-verified] Evidence: E-ANCHOR-012. [production-observed] Evidence: E-ANCHOR-008.

## Delivery Status

The local checkout is named `anchor`, while compatibility-sensitive runtime identifiers remain unchanged. The static site is deployed at the public Anchor hostname: `/` and `/app/` return their intended surfaces, while `/app/index.html` canonicalizes to `/app/`. [production-observed] Evidence: E-ANCHOR-008.

The production web regression passed, but that result does not certify Android installation, database migration, model correctness, cloud synchronization, or other unsupported platform builds. [source-verified] Evidence: E-ANCHOR-009.

## Code Entrypoints

- Flutter startup and navigation: `lib/main.dart` and `lib/app.dart`.
- Local persistence: `lib/data/database/database_helper.dart` and `lib/data/repositories/`.
- Ingestion, generation, Agent, evaluation, and privacy services: `lib/services/`.
- Browser Demo data and runtime: `web/landing/app/scripts/data.js` and `web/landing/app/scripts/app.js`.
- Web unit/E2E gates: `web/tests/data.test.mjs` and `web/tests/demo.spec.js`.
- Android Private Alpha CI: `.github/workflows/ci.yml`.

[source-verified] Evidence: E-ANCHOR-004, E-ANCHOR-006, E-ANCHOR-007, E-ANCHOR-011, E-ANCHOR-012.

## Evidence

Primary evidence: E-ANCHOR-001 through E-ANCHOR-012. Source-backed statements come from the Flutter repository and the isolated web commits; deployment observations are separately labeled.

## Interview Focus

Expect questions about locator stability, structure-aware chunking, citation versus answer validation, content-hash imports, local database migrations, checkpoint recovery, the value and limits of a static Demo, storage-version normalization, and why “anti-hallucination” is expressed as a gate rather than an absolute guarantee.
