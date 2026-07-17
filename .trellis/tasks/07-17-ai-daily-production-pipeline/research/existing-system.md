# Existing AI Daily and Studio system

## Current offline path

- `package.json:34-43` exposes `ai-daily:draft`, Studio export, brief checks, and smoke checks.
- `scripts/generate-ai-daily-draft.mjs:68-105` validates a local source JSON file.
- `scripts/generate-ai-daily-draft.mjs:158-259` renders an evidence-oriented Markdown draft.
- `scripts/generate-ai-daily-draft.mjs:263-277` only reads a local file and writes Markdown. It performs no discovery, fetch, model call, scheduling, or publication.
- `docs/ai-daily-pipeline.md:94-115` documents this as an offline compatibility tool.

## Current Studio path

- `prisma/schema.prisma:155-183` defines `SourceItem` and `AiDailyIssue`; the issue currently stores source IDs in JSON rather than a relation.
- `server/src/studioRoutes.ts:525-642` implements source list/create and issue list/create/detail/update.
- `server/src/studioRoutes.ts:644-711` converts an evidence-ready issue into a hidden review-needed draft.
- `server/src/studioAiDailyReadiness.ts:35-64` is the server-side issue readiness gate.
- `src/utils/studioAiDailyBrief.ts:84-233` owns frontend brief parsing, validation, and readiness feedback.
- `src/pages/StudioAiDailyIssuePage.tsx:152-271` loads and edits one issue and blocks invalid review-ready transitions.

## Current review and publication path

- `server/src/studioReviewPolicy.ts:108-176` owns draft review transitions.
- `server/src/studioReviewPolicy.ts:178-285` validates Publish Export readiness and report transitions.
- `scripts/export-studio-draft.ts:624-669` rechecks draft/review/version bindings before and after local file writes.
- `scripts/export-studio-draft.ts:448-456` currently flattens `source-card` blocks to text, so source URL snapshots must be added for a citation-preserving export.

## Confirmed gaps

- No production source registry, RSS/API/search discovery, original-page retrieval, deterministic dedupe, semantic clustering, explainable ranking, scheduled runner, or run observability exists.
- `SourceItem.url` has no canonical identity constraint, and issue/source ownership is a JSON ID array.
- AI Daily issue states mix processing and editorial concepts and allow arbitrary enum jumps.
- Issue, draft, review, export, and actual deployed publication do not share one explicit state authority.
- The current offline and Studio paths duplicate some data/validation concepts.
- Existing automated checks are mostly helper assertions and offline smoke; there are no database-backed AI Daily route integration tests.

## Reusable components

- `buildAiDailyIssueReadinessIssues`
- `validateAiDailyBrief` and `evaluateAiDailyIssueReadiness`
- `buildAiDailyDraftInput` and `buildAiDailyDraftBody`
- Studio review/version/export policy helpers
- temporary-directory smoke pattern in `scripts/check-studio-smoke.mjs`
- existing safe blog model configuration/redaction/fallback primitives
