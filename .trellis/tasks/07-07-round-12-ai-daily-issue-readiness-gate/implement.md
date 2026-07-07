# Implementation Plan

## Checklist

- [x] Load Trellis pre-development context and relevant backend/frontend specs.
- [x] Add frontend AI Daily readiness helper and deterministic cases.
- [x] Update `/studio/ai-daily/:issueId` to show combined readiness and gate review/draft progression.
- [x] Add backend review-ready transition guard in `server/src/studioRoutes.ts`.
- [x] Add user-facing API error text for `ai-daily-issue-not-ready`.
- [x] Update AI Daily workflow spec with the readiness gate.
- [x] Run targeted and broad validation.
- [ ] Commit and archive the child task.

## Validation Commands

- `npm.cmd run studio:ai-daily-brief-check`
- `npm.cmd run server:build`
- `npm.cmd run server:smoke`
- `npm.cmd run assistant:service-modes-smoke`
- `npm.cmd run studio:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `git diff --check`

## Safety Checks

- Do not read `.env*` values.
- Do not run model/provider live checks.
- Do not fetch external source URLs.
- Do not write production credentials or private endpoint details.
