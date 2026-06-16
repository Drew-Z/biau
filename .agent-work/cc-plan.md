# Builder Plan: Legal RAG Report Boundary Asset

Date: 2026-06-16
Task: Add Legal RAG report-export/model-replacement boundary evidence.
Builder: Claude Code via `cc`

## Builder Findings

- `/cases/legal-rag` already has four evidence assets:
  - contract review workbench screenshot
  - knowledge import screenshot
  - citation QA screenshot
  - RAG flow diagram
- `docs/showcase-assets.md` lists the remaining Legal RAG gap as a report-export or model-replacement boundary diagram.
- The new asset should explain capability boundaries, not imply that production PDF/DOCX export, real model API integration, pgvector, or queue-based export already exists.

## Proposed Scope

1. Create `public/images/projects/showcase/legal-rag-report-boundary.svg`.
2. Add one Legal RAG evidence card in `caseImagesById['legal-rag']`.
3. Update `docs/showcase-assets.md` to mark the Legal RAG gap as covered and add the new SVG to the asset list.
4. Update `.agent-work/current-task.md` and `.agent-work/verification.md`.

## Visual Direction

- Split the SVG into two clearly labeled areas:
  - Current MVP boundary: document import, manual/section-aware chunking, mock embedding, memory vector index, retrieval/rerank, citations, contract review display, browser print preview.
  - Production extension path: real embedding service, pgvector, server-side PDF/DOCX export module, queue-based large imports/exports, real model credentials and rate-limit strategy.
- Use visual distinction:
  - completed/current boundary: green solid border
  - future extension boundary: orange dashed border
- Add a short note that report output is currently front-end display/print-preview oriented and production export remains an integration boundary.

## Public Safety Notes

- Do not publish API keys, tokens, local paths, IPs, endpoints, database URLs, model credentials, real contract content, customer data, or legal advice.
- Do not mention specific provider endpoints or concrete credential names.
- Use abstract labels such as "真实 Embedding 服务" and "真实模型 API" without configuration details.

## Verification Plan

- Confirm the SVG exists and has no secret-like strings or local paths.
- Run `npm run lint`.
- Run `npm run build`.
- Run sensitive/public wording scan.
- Browser-check `/cases/legal-rag` at desktop and mobile widths:
  - image loads and decodes
  - no console errors
  - no failed requests
  - no horizontal overflow
  - no non-product positioning wording

## Non-goals

- Do not add backend export features.
- Do not add dependencies.
- Do not change routes, layouts, package files, or reference projects.
