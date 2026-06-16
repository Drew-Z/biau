# Codex Controller Review

Date: 2026-06-16
Task: Legal RAG report-export/model-replacement boundary asset

## Decision

Approved as a narrow evidence-asset slice.

The plan correctly avoids claiming production export or real model integration. The new SVG should be framed as a boundary and extension-path diagram, not a completed runtime screenshot.

## Required Scope

1. Create one SVG:
   - `public/images/projects/showcase/legal-rag-report-boundary.svg`
2. Add one evidence card to `caseImagesById['legal-rag']` in `src/App.tsx`.
3. Update `docs/showcase-assets.md` to mark the Legal RAG gap as covered and list the new asset.
4. Update `.agent-work/current-task.md` and `.agent-work/verification.md`.

## Copy Requirements

- Use wording such as "当前 MVP 边界" and "生产扩展路径".
- Make clear that browser print preview/front-end display is the current report path.
- Make clear that PDF/DOCX server-side export, real model API, pgvector, and queue processing are future integration boundaries.
- Do not present the diagram as a production architecture already deployed.

## Non-goals

- No backend feature work.
- No dependency changes.
- No route or layout restructuring.
- No reference-project edits.
- No secrets, endpoints, local paths, real contract content, or legal advice.

## Verification Requirements

- Confirm SVG exists and is valid enough for browser display.
- Run `npm run lint`.
- Run `npm run build`.
- Run sensitive/public wording scan.
- Browser QA local `/cases/legal-rag` at desktop and mobile widths.
- Record results in `.agent-work/verification.md`.
