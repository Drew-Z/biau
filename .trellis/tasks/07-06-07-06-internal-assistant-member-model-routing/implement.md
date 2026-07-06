# Internal assistant member model routing implementation plan

## Checklist

- [x] Load task artifacts and relevant Trellis specs.
- [x] Audit existing Prisma schema, server assistant modules, admin page, member assistant page, scripts, and docs.
- [x] Identify exact gaps between current implementation and PRD acceptance criteria.
- [x] Implement the smallest safe code/data/doc changes needed to close those gaps.
- [x] Add or update no-live validation coverage where practical.
- [x] Update parent manual-action queue for any production-only steps.
- [x] Run validation:
  - [x] `npm.cmd run prisma:validate`
  - [x] `npm.cmd run prisma:generate`
  - [x] `npm.cmd run server:build`
  - [x] `npm.cmd run assistant:service-modes-smoke`
  - [x] `npm.cmd run server:smoke`
  - [x] `npm.cmd run lint`
  - [x] `npm.cmd run build`
  - [x] `npm.cmd run check:ui`
  - [x] `git diff --check`
- [ ] Commit and push `origin main` if checks pass.

## Implementation Notes

- Prefer existing backend helpers and UI patterns.
- Do not introduce a provider-specific dependency unless the code already has that abstraction.
- Keep all generated examples fake and obviously placeholder-safe.
- If live validation is needed, write it as a manual gate rather than running it.

## Progress Log

- 2026-07-06: Closed the member model-channel routing gap by adding active/inactive channel semantics, safe `isActive` summaries, resolved `UsageLog.modelChannelId`, admin/member UI status labels, and no-live smoke coverage for assigned-channel routing plus inactive-channel fallback to the default channel.
- 2026-07-06: Updated deployment docs and Trellis specs so future work keeps member rows secret-free, stores only low-sensitive channel ids, rejects inactive assignments, and treats production migration/live model validation as manual gates.
