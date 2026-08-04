# Public assistant provider cutover implementation

## Work

- [x] Inspect the deployed primary/fallback configuration without exposing secrets.
- [x] Promote `grok-4.5` to primary and retain `grok-4.20-multi-agent-high` as the bounded fallback model.
- [x] Permit unchanged question resubmission and make the command label reflect resend versus edit.
- [x] Add deterministic UI contract coverage for unchanged and changed edit states.
- [x] Run focused and repository quality gates.
- [ ] Commit, push `main`, deploy only `biau-public-assistant-api`, and verify redacted health.

## Constraints

- Do not call a live model, provider catalog, or liveness endpoint.
- Do not touch the parallel AI Daily or project-notes working tree changes.
- Do not expose Render secrets in source, logs, screenshots, or task artifacts.
