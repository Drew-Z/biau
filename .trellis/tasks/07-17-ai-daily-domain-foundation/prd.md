# AI Daily domain foundation

## Goal

Create the shared database and domain foundation required by every AI Daily production capability without changing public behavior yet.

## Dependencies

- Parent architecture: `07-17-ai-daily-production-pipeline` must remain the source of truth.
- No child task dependency. This is the first implementation task.

## Requirements

- Define `fixture`, `degraded`, and `production` profiles and configuration-readiness results.
- Separate run status, run stage, issue editorial state, generated-revision validation state, flash lifecycle state, flash-revision state, draft state, review state, export state, and deployed-public truth.
- Add non-destructive Prisma models for feeds, runs, run events, candidates, clusters, ordered issue sources, generated revisions, logical flash items, immutable flash revisions, and approval history.
- Add canonical source identity, edition-date uniqueness, selection versions, work idempotency keys, leases, attempt history, and freshness checkpoint fields.
- Preserve existing sources, AI Daily issues, drafts, reviews, and exports during migration.
- Add versioned citation snapshots so future static export can retain original URLs and evidence excerpts.
- Provide shared fixture builders and transition guards for later child tasks.

## Acceptance Criteria

- [x] Existing Studio data can migrate forward without destructive deletes or arbitrary state conversion.
- [x] Prisma validation/generation and server type-check pass.
- [x] State-transition tests reject invalid cross-domain transitions.
- [x] Canonical source, edition, flash revision, and work idempotency constraints are deterministic.
- [x] Existing AI Daily routes and offline draft behavior remain compatible until later tasks replace them.
- [x] Hidden database records remain absent from public selectors and generated content.

## Validation

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run studio:ai-daily-domain-check
npm.cmd run studio:ai-daily-repository-check
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:review-policy-check
npm.cmd run studio:smoke
npm.cmd run blog:check
```
