# Internal RAG sync and Studio AI Daily production closure

## Goal

Close the current production-readiness gap between the internal assistant, RAG Orchestrator, Content Studio, and AI Daily authoring flow.

The task should make the next manual actions obvious while also implementing any local, low-risk improvements that help verify or operate the flow without exposing secrets or triggering unapproved model calls.

## Requirements

- R1. Treat the current production evidence as the baseline:
  - public assistant health is online and model-configured.
  - internal assistant health is online with database and model configured.
  - RAG Orchestrator is online with Qdrant public collection populated.
  - RAG Orchestrator internal collection is still empty and must not be presented as complete.
  - Studio routes are token-gated; token entry and production acceptance remain a human gate.
- R2. Do not ask the user to paste tokens, database URLs, model keys, member tokens, admin tokens, or private endpoints into chat.
- R3. Do not run model "live tests", ping prompts, poems, or other non-business model calls. Any model call must be tied to an explicit approved content or assistant task.
- R4. Prefer local/public-safe verification: health endpoints, static status data, admin UI state, smoke scripts, contract checks, and low-sensitive diagnostics.
- R5. If internal knowledge sync can be verified without new secrets, verify it. If it needs the user's browser/admin token or platform variables, produce exact manual steps and expected low-sensitive results.
- R6. If Studio/AI Daily can be improved locally, improve the smallest missing workflow affordance or check. If it needs the Studio token, record a manual acceptance checklist.
- R7. Keep public status honest: planned, gated, unchecked, skipped, and degraded must not be rewritten as online without evidence.

## Acceptance Criteria

- [ ] Current internal RAG sync state is rechecked and summarized with low-sensitive evidence.
- [ ] The user has a clear browser-side checklist for internal knowledge sync, Studio token acceptance, and first AI Daily issue flow.
- [ ] Any stale manual-gate wording discovered during the task is updated.
- [ ] Any small local check or UI affordance needed to prevent future confusion is implemented and verified.
- [ ] Validation commands are run for touched areas, at minimum the relevant smoke/check scripts plus lint/build if code changes are made.
- [ ] Remaining human-only actions are listed without secrets.

## Notes

- This task is not a broad redesign of the assistant architecture.
- This task may end with some production actions still gated by the user's platform access.
