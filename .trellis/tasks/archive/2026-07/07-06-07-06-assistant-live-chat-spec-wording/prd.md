# Assistant live chat spec wording alignment

## Goal

Align assistant model-provider quality guidelines with the newly enforced
monitoring rule: live `/api/chat/public` checks are opt-in, not a default
scheduled or diagnostic action.

## Requirements

- Update `.trellis/spec/backend/quality-guidelines.md` so future agents know
  `/api/health` can be checked first, but live `/api/chat/public` validation
  requires explicit approval or the synthetic opt-in gate.
- Do not change runtime code or public status data in this task.
- Do not run a live assistant chat/model request.

## Acceptance Criteria

- [x] Backend quality spec mentions the explicit opt-in requirement for live
      public assistant chat checks.
- [x] `git diff --check` passes.

## Notes

- Parent task: `07-04-biau-port-continuous-improvement`.
