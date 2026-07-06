# Assistant Studio AI Daily Production Closure Design

## Boundary

This child task owns the `blog-semi` internal assistant, Studio, and AI Daily content workflow surfaces that can be verified locally without live model calls or production secrets. It does not publish public blog posts, fetch AI news sources, or validate private database credentials.

## Current Architecture

- Studio API uses `STUDIO_DATABASE_URL` first and falls back to `DATABASE_URL` only when the dedicated Studio database is not configured.
- Internal assistant may create Studio drafts, but draft creation is constrained to `hidden + review-needed` and does not approve, export, or publish.
- AI Daily has two safe entry points:
  - Offline source pack to draft: `npm.cmd run ai-daily:draft -- --source <json>`.
  - Studio issue detail to draft: `/studio/ai-daily/:issueId` plus `/studio/api/ai-daily/issues/:id/content-draft`.
- Local validation is centralized in `npm.cmd run studio:smoke`; it must remain offline, deterministic, and temporary-output only.

## Target Slice

The first implementation slice should establish a production-readiness record:

- run `studio:smoke` and inspect whether it still proves the no-live pipeline;
- check docs/UI/API wording for `DATABASE_URL` vs `STUDIO_DATABASE_URL` confusion;
- add a concise repo-owned checklist or task note if the workflow is already correct but needs a persistent handoff;
- only change code if a real mismatch or confusing public/admin-facing state is found.

## Safety

Do not inspect `.env*`, do not print tokens, and do not call model providers. Live Studio API, production database migration, Render shell operations, and automated publishing remain manual gates.

