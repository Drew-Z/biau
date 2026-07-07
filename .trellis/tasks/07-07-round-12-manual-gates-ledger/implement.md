# Implementation Plan

## Checklist

- [x] Load relevant docs/spec context.
- [x] Create `docs/manual-gates.md`.
- [x] Add `scripts/check-manual-gates.mjs`.
- [x] Add `docs:manual-gates-check` to `package.json`.
- [x] Wire the check into `scripts/verify.mjs`.
- [x] Add cross-links from existing docs.
- [x] Run docs/manual gate check, observability docs check, lint/build as needed, full verify if practical.
- [ ] Commit and archive the child task.

## Validation Commands

- `npm.cmd run docs:manual-gates-check`
- `npm.cmd run docs:observability-check`
- `npm.cmd run verify`
- `git diff --check`
- Diff-level sensitive scan over changed docs/scripts.
