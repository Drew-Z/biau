# Round 9 AI Daily brief guard

## Goal

Improve AI Daily Studio issue editing by adding a shared brief template/validation helper, visible local brief quality feedback, and deterministic checks without live models or production credentials.

## Requirements

- R1. Extract the AI Daily issue brief template and validation rules from the page into a shared frontend utility.
- R2. Validate that brief JSON contains the editorial fields needed for a useful AI Daily issue: `summary`, `publicAngle`, `keySignals`, and `toVerify`.
- R3. Show local, non-blocking brief quality feedback in `/studio/ai-daily/:issueId` before save/convert actions.
- R4. Keep all checks local and deterministic; do not call models, fetch news, connect production databases, or require tokens.
- R5. Add a small script check so the template and validation behavior cannot silently drift.

## Acceptance Criteria

- [x] AI Daily issue page uses a shared brief template/validator instead of page-local ad hoc shape checks.
- [x] Invalid brief JSON still produces clear save-blocking feedback; incomplete but parseable brief JSON produces visible quality feedback.
- [x] A local script verifies the default template passes, malformed JSON fails, and incomplete objects report expected issues.
- [x] `studio:smoke`, the new brief check, `lint`, `build`, and `verify` pass.
- [x] Manual gates and push limitation are recorded.
- [x] Changes are committed locally; push remains deferred until SSH host key verification is resolved.

## Notes

- Current page only checks that brief JSON parses to an object. That is too weak for a production editorial workflow.

## Result

- Added `src/utils/studioAiDailyBrief.ts` as the shared owner for default template, JSON parsing, field validation, and formatting.
- Updated `/studio/ai-daily/:issueId` to show ready/warning/error brief feedback near the textarea and to block save on malformed or incomplete brief fields.
- Preserved partial saved brief objects in the editor so missing fields remain visible instead of being replaced by the empty default template.
- Added `scripts/check-studio-ai-daily-brief.ts` and wired `studio:ai-daily-brief-check` into `verify`.
- Documented the reusable brief contract in `.trellis/spec/backend/ai-daily-workflow.md` and `docs/ai-daily-pipeline.md`.

## Validation

- `npm.cmd run studio:ai-daily-brief-check` passed.
- `npm.cmd run studio:smoke` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed.
- `git diff --check` passed with only Windows line-ending warnings.
- Secret-like scan over changed and untracked files found no real key/token/database URL matches.

## Manual Gates

- GitHub SSH host key verification still blocks `git push origin main`.
- Real AI Daily model-assisted generation, live source fetching, first production issue conversion, and public export remain human-approved follow-up tasks.
