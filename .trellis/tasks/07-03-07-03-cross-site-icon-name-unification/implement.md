# Implement

## Steps

- [x] Read Trellis frontend specs and this task's PRD/design.
- [x] Inventory target repositories:
  - [x] `blog-semi`
  - [x] `erp`
  - [x] `game`
  - [x] `legal-rag`
  - [x] `pet`
  - [x] `xunqiu`
  - [x] `xunqiu-backend-modern`
- [x] Build a brand surface table in `brand-audit.md`.
- [x] Apply low-risk brand/icon/name edits repo by repo.
- [x] Run per-repo validation and record results.
- [x] Update main-site data/status/assistant references if project names or URLs changed.
- [x] Run main-site validation.
- [x] Run changed-file sensitive scan.
- [ ] Commit and push each changed repository that passes validation.
- [ ] Archive task and record journal.

## Rollback

For each repository, revert only the specific files changed in that repository if validation proves the brand shell broke routing/build. Do not reset unrelated user changes.
