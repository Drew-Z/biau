# Implementation Plan

## Checklist

- [x] Load assistant state and agentic workspace specs.
- [x] Expand `scripts/check-assistant-meta-normalizers.ts` artifact fixtures.
- [x] Assert safe href canonicalization and unsafe artifact rejection.
- [x] Run targeted and broad validation.
- [x] Archive and commit the child task.

## Validation Commands

- `npm.cmd run assistant:meta-check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Diff-level sensitive scan over changed files.

## Validation Results

- `npm.cmd run assistant:meta-check` passed.
- The check now covers safe id deep links, safe slug deep links, legacy `/studio`, extra-query canonicalization, mismatched links, external links, unsafe status/visibility, unknown artifact kinds, and extra unsafe fields.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed; Vite reported only the existing ineffective dynamic import warnings.
- `npm.cmd run verify` passed, including `assistant:meta-check`, server smoke, Studio smoke, preview, and UI checks.
- `git diff --check` passed.
- Added-line sensitive scan over changed files returned no matches.
