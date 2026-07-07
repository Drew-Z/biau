# AI Daily Brief Guard Implementation Plan

## Steps

1. [x] Read relevant Studio/frontend specs.
2. [x] Add shared AI Daily brief utility with template, parse, validate, and format helpers.
3. [x] Update `StudioAiDailyIssuePage` to use the helper and show brief quality feedback.
4. [x] Add CSS for the quality panel.
5. [x] Add a deterministic script check and package script.
6. [x] Run validation.
7. [x] Update task notes and commit locally; keep push as manual gate.

## Validation Candidates

- `npm.cmd run studio:ai-daily-brief-check`
- `npm.cmd run studio:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`

## Manual Gates

- GitHub SSH host key verification remains required before pushing.
- Real AI Daily model-assisted generation and first production issue conversion remain human-approved tasks.

## Validation Results

- `npm.cmd run studio:ai-daily-brief-check` passed.
- `npm.cmd run studio:smoke` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed.
- `git diff --check` passed with only Windows CRLF warnings.
- Secret-like scan over changed and untracked files found no real credentials or connection strings.
