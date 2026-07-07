# Round 14 AI Daily issue token prompt guard

## Goal

Make the AI Daily issue detail route show a clear no-token prompt on first load and guard it in local UI checks.

## Requirements

- R1. `/studio/ai-daily/:issueId` should show a clear no-token prompt on first load when no Studio token is stored.
- R2. The prompt must not imply that the issue data was loaded or that production Studio is configured.
- R3. The route must remain usable without a token because editors can still see the local brief template and paste a token.
- R4. Add a local UI guard so the prompt does not regress.
- R5. Do not call live Studio APIs, databases, models, or cloud services.

## Acceptance Criteria

- [x] The AI Daily issue detail page displays a no-token prompt immediately when opened without a stored token.
- [x] `npm.cmd run check:ui` asserts the prompt on `/studio/ai-daily/ui-check-issue`.
- [x] Existing Studio token save/refresh behavior remains intact.
- [x] Required validation commands pass.

## Out of Scope

- Creating, saving, or converting real AI Daily issues.
- Changing Studio API routes or database schema.
- Model-assisted AI Daily generation.
