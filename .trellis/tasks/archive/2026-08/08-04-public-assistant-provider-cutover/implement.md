# Public assistant provider cutover implementation

## Work

- [x] Inspect the deployed primary/fallback configuration without exposing secrets.
- [x] Promote `grok-4.5` to primary and retain `grok-4.20-multi-agent-high` as the bounded fallback model.
- [x] Permit unchanged question resubmission and make the command label reflect resend versus edit.
- [x] Add deterministic UI contract coverage for unchanged and changed edit states.
- [x] Run focused and repository quality gates.
- [x] Commit, push `main`, deploy only `biau-public-assistant-api`, and verify redacted health.

## Validation

- `assistant:public-model-check`, `assistant:public-agent-check`, `assistant:public-api-check`, and `assistant:public-quality-check` passed without live provider calls.
- `server:build`, `lint`, `build`, `git diff --check`, and the 17-route two-viewport `check:ui` suite passed.
- Render revision `7f80423f` is live; direct and Cloudflare health return the redacted configured state.
- Safe Render fields show `grok-4.5` primary, `grok-4.20-multi-agent-high` fallback, Responses protocol, and zero Mimo references.
- The deployed assistant chunk contains both `重新发送` and `发送修改` states.

## Constraints

- Do not call a live model, provider catalog, or liveness endpoint.
- Do not touch the parallel AI Daily or project-notes working tree changes.
- Do not expose Render secrets in source, logs, screenshots, or task artifacts.
