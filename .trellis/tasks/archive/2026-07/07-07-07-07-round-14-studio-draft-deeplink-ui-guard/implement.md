# Implementation Plan

## Checklist

- [x] Load relevant frontend state/quality specs.
- [x] Add `/studio?draft=ui_check_draft_01` route case to `scripts/check-ui.mjs`.
- [x] Add route-specific assertion for the token-needed draft lookup message.
- [x] Run targeted and broad validation.
- [x] Archive and commit the child task.

## Validation Commands

- `npm.cmd run check:ui`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Added-line sensitive scan over changed files.

## Validation Results

- `npm.cmd run check:ui` passed for 13 routes across 2 viewports; the new route is `/studio?draft=ui_check_draft_01`.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed; Vite reported only the existing ineffective dynamic import warnings.
- `npm.cmd run verify` passed, including assistant, Studio smoke, project detail, status contract, preview, and UI checks.
- `git diff --check` passed.
- Added-line sensitive scan over changed files returned no matches.
