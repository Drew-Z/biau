# Project pages assistant QA

## Goal

Verify the newly enriched project case-study pages and public assistant knowledge after the project-page content pass. The work should catch content gaps, stale generated knowledge, and obvious assistant-answer quality issues before moving on to blog cleanup.

User value: visitors should be able to understand the showcased projects from the project pages, and the public assistant should answer common project questions accurately without overclaiming current maturity or exposing private/internal-only details.

## Confirmed Facts

- The site is a React/Vite/TypeScript/Semi Design project.
- Main project data lives in `src/data/portfolio.ts`.
- Project detail pages render shared `Project.detailContent` via `src/pages/ProjectDetailPage.tsx`.
- Public assistant project summaries are derived from `Project.summary` and `Project.assistantContext` through `getProjectAssistantSummary` in `src/data/portfolio.ts`.
- `scripts/generate-assistant-knowledge.ts` generates `server/data/public-knowledge.json`.
- The previous parent task improved project pages and public knowledge for Legal RAG, Xunqiu, Ozon ERP, Biau Playlab, individual games, and AI pet workspace.
- Blog content cleanup is intentionally deferred until after this project-page and assistant QA pass.
- Private/internal assistant knowledge ingestion remains out of scope for this task.
- Known existing unrelated working-tree changes are `AGENTS.md`, `.agents/`, `.codex/`, and `docs/agents/codex-workflow.md`; this task should not revert or stage them.

## Requirements

- R1 Project-page coverage: each showcased project should have visitor-readable content for purpose, implementation shape, technical stack/architecture, current limitations or maturity, and follow-up optimization direction when applicable.
- R2 Assistant knowledge freshness: generated public knowledge should match `src/data/portfolio.ts` after any edits and should include the enriched project context.
- R3 Assistant answer quality: common project questions should retrieve enough grounded public knowledge to answer accurately across major projects and avoid claims that contradict the project pages.
- R4 Scope discipline: do not start the broader blog cleanup in this task; only fix blog references if they directly break project-page or assistant QA.
- R5 Privacy boundary: public assistant/project content must not add private credentials, secret endpoints, private deployment details, or internal-only usage instructions.
- R6 Maintainability: prefer the existing data-driven project model over hard-coded one-off JSX or duplicate generated data edits.

## Acceptance Criteria

- [x] `src/data/portfolio.ts` contains adequate `detailContent` and `assistantContext` coverage for Legal RAG, Xunqiu, Ozon ERP, Biau Playlab, the individual game entries, and AI pet workspace.
- [x] `server/data/public-knowledge.json` is regenerated from source data and is not manually patched.
- [x] A representative assistant QA set is checked, covering at least: project overview, project-specific architecture/implementation, WIP boundary for `pet-workspace`, deployed-showcase boundary for games, and next-step/roadmap questions.
- [x] Any content issues found during QA are fixed in source data or documented if intentionally deferred.
- [x] Validation runs include `npm.cmd run assistant:index`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run verify`, or the final notes explain any command that cannot be run.

## Out of Scope

- Rewriting the blog catalog or blog detail content.
- Building a separate internal/private assistant knowledge ingestion pipeline.
- Re-auditing the external source repositories from scratch unless a project-page claim looks suspicious during QA.
- Changing deployment infrastructure or production URLs.

## Open Questions

None blocking. Default recommendation is to proceed with a lightweight PRD-only task: inspect the data and generated knowledge, make small source-data fixes if needed, regenerate knowledge, and run the standard validation commands.
