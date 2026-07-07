# Round 12 AI Daily issue readiness gate

## Goal

Strengthen AI Daily issue readiness so Studio issue detail and server status transitions require evidence-rich brief and source quality before review/draft steps, without live model calls.

## Background

- `/studio/ai-daily/:issueId` already validates the JSON shape of the issue brief through `src/utils/studioAiDailyBrief.ts`.
- `POST /studio/api/ai-daily/issues/:id/content-draft` blocks conversion only when no sources are selected.
- `PATCH /studio/api/ai-daily/issues/:id` can currently move an issue to `review-needed` without proving source quality or a complete brief.
- AI Daily should remain Studio-first, source-backed, manually reviewed, and deterministic; this task must not call models, fetch source URLs, or require a production database.

## Requirements

- R1. Add an AI Daily issue readiness contract that combines brief validation with selected-source quality.
- R2. The Studio issue page must show readiness problems before the editor tries to enter review or convert to a draft.
- R3. The Studio API must reject moving an issue into review-ready states when readiness has blocking errors.
- R4. Draft conversion must continue to create only hidden, review-needed, model-free AI Daily drafts.
- R5. The implementation must not call live models, external URLs, production databases, or cloud services.
- R6. Validation must be covered by deterministic local checks and documented in the AI Daily workflow spec.

## Acceptance Criteria

- [x] `studio:ai-daily-brief-check` covers complete, incomplete, thin, malformed, source-poor, and source-ready issue readiness cases.
- [x] `/studio/ai-daily/:issueId` displays combined readiness state and disables review/draft progression when blocking readiness errors exist.
- [x] `PATCH /studio/api/ai-daily/issues/:id` returns a stable error for review-ready status transitions when readiness is not met.
- [x] `POST /studio/api/ai-daily/issues/:id/content-draft` still refuses no-source conversion and preserves hidden + review-needed + `aiAssistance: "none"`.
- [x] Relevant specs/docs reflect the new readiness gate.
- [x] Required local validation commands pass.

## Out of Scope

- Live model-assisted AI Daily generation.
- Fetching, scraping, summarizing, or validating external source URLs.
- Production database or Render/Supabase/Aiven verification.
- Public auto-publication or scheduled AI Daily jobs.

## Results

- Added frontend issue readiness evaluation to combine brief quality and selected-source evidence.
- Updated `/studio/ai-daily/:issueId` to show readiness, keep normal saves available, and block review/draft progression until readiness passes.
- Added a server-side Studio readiness helper and wired it into review-ready status transitions and content-draft conversion.
- Added the stable `ai-daily-issue-not-ready` frontend error message.
- Expanded deterministic checks to cover frontend and server readiness helpers.
- Updated the AI Daily workflow spec and pipeline docs.

## Verification

- `npm.cmd run studio:ai-daily-brief-check`
- `npm.cmd run server:build`
- `npm.cmd run server:smoke`
- `npm.cmd run assistant:service-modes-smoke`
- `npm.cmd run studio:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `npm.cmd run verify`
- `git diff --check`
- Diff-level sensitive scan for newly added secret-like values: no matches.
