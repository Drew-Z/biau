# Implementation Plan

## Checklist

- [x] Load AI Daily workflow and frontend state specs.
- [x] Add no-token display status to `StudioAiDailyIssuePage`.
- [x] Add route-specific UI assertion to `scripts/check-ui.mjs`.
- [x] Run targeted and broad validation.
- [x] Archive and commit the child task.

## Validation Commands

- `npm.cmd run studio:ai-daily-brief-check`
- `npm.cmd run check:ui`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Added-line sensitive scan over changed files.

## Validation Results

- `npm.cmd run studio:ai-daily-brief-check` passed.
- `npm.cmd run check:ui` passed against a fresh temporary preview at `http://127.0.0.1:4175`.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed, including fresh preview `check:ui` at `http://127.0.0.1:4174`.
- `git diff --check` passed with line-ending warnings only.
- Added-line sensitive scan produced no matches.
