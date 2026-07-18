# AI Daily Studio editorial workspace

## Goal

Provide a coherent Content Studio workspace for operating sources, runs, events, flash approvals, generated revisions, manual drafts, and daily-edition review.

## Dependencies

- Requires `07-17-ai-daily-domain-foundation` complete.
- API/UI can begin with fixtures, but integration acceptance requires `07-17-ai-daily-ingestion-evidence` and `07-17-ai-daily-generation-runner` complete.
- Produces approved flash revisions consumed by `07-17-ai-daily-public-feed`.

## Requirements

- Add Runs, Sources, Candidates/Events, Flash Review, and Edition views.
- Show freshness, funnels, evidence, grouping reasons, scores, citations, verifier findings, quality findings, and sanitized errors.
- Support source management, include/exclude/reorder, merge/split, request evidence, retry/cancel, and manual queue actions.
- Support explicit editor-only evidence-to-manual-draft transition.
- Support `NEEDS_EDITOR_REVIEW` correction and revalidation before draft promotion.
- Implement immutable flash correction: new draft revision, atomic supersession on approval, stable public ID, and immediate withdrawal.
- Use optimistic concurrency for all editor actions.
- Keep secrets, raw provider bodies, and internal stack traces out of UI/API responses.

## Acceptance Criteria

- [x] Editors can locate the current run, selected evidence, generated output, and required action without editing JSON.
- [x] Manual and assisted draft paths produce correct issue states and preserve evidence versions.
- [x] Flash approve/hold/correct/withdraw transitions are deterministic and audited.
- [x] Protected drafts and revisions reject stale optimistic writes.
- [x] Desktop and mobile views have no unintended overflow or clipped controls.
- [x] Public content is not exposed by authenticated editorial endpoints alone.

## Validation

```powershell
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:ai-daily-flash-check
npm.cmd run studio:review-policy-check
npm.cmd run studio:smoke
npm.cmd run server:smoke
npm.cmd run check:ui
npm.cmd run lint
npm.cmd run build
```
