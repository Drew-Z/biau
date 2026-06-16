# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code via `cc`

## Goal

Add one public-safe Legal RAG evidence asset for the report-export or model-replacement boundary, closing the current Legal RAG showcase gap.

## Scope

- Use existing blog-semi Legal RAG content and screenshots as source context.
- Create or add one public-safe visual asset:
  - `public/images/projects/showcase/legal-rag-report-boundary.svg`
- Add the asset to the Legal RAG case evidence matrix.
- Update docs/showcase-assets.md and verification notes.

## Non-goals

- Do not add a new project, route, dependency, backend feature, or real export implementation.
- Do not claim the project already has production PDF/DOCX export or real model provider integration.
- Do not publish raw contracts, legal advice, customer data, API keys, model credentials, local paths, IPs, endpoints, tokens, or private configs.
- Do not modify reference projects or generated runtime screenshots.

## Allowed Paths

- public/images/projects/showcase/legal-rag-report-boundary.svg
- src/App.tsx
- docs/showcase-assets.md
- .agent-work/current-task.md
- .agent-work/verification.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md

## Acceptance Criteria

- [x] `cc` produces a read-only plan before implementation.
- [x] The visual asset clearly explains report export and/or model replacement boundaries without implying completed production integrations.
- [x] /cases/legal-rag includes the new Legal RAG evidence card.
- [x] docs/showcase-assets.md marks the Legal RAG gap as covered.
- [x] npm run lint and npm run build pass in WSL.
- [x] Sensitive/public wording scan is reviewed.
- [x] Browser QA confirms local /cases/legal-rag loads the new SVG without console errors or horizontal overflow.

## Verification Plan

- Confirm SVG exists and contains no secrets or local paths.
- Run npm run lint.
- Run npm run build.
- Run sensitive/public wording scan.
- Browser-check /cases/legal-rag at desktop and mobile widths.
- Commit and push after verification passes.
