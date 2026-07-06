# Internal assistant member model routing design

## Scope

This task touches only the internal assistant model-channel path:

- Prisma/member/channel shape and safe backend serialization.
- Assistant chat provider/channel resolution.
- Admin member/channel controls.
- Member-facing channel/status display.
- Documentation and local non-live validation.

It does not deploy services, run production migrations, validate real model providers, or introduce new cloud resources.

## Existing Direction

The parent task records that `07-06-internal-assistant-finalization` already implemented a local MVP: schema, API, admin UI, safe summaries, and mock provider routing. This child therefore starts with an audit and only changes gaps that are still observable in code or validation.

## Data Contract

- `Member.modelChannelId` is optional.
- A `ModelChannel`-like backend record or configured channel exposes only safe fields to the browser:
  - `id`
  - `label`
  - `provider`
  - `model`
  - `isDefault`
  - `isActive`
- Secrets and connection details never leave the server.

## Routing Contract

When an internal member sends a message:

1. Authenticate member token.
2. Load member profile and configured channel.
3. Resolve channel:
   - use active member-assigned channel;
   - otherwise use active default channel;
   - otherwise use mock/local fallback with an explicit degraded summary.
4. Generate response through the selected provider abstraction.
5. Persist message and usage metadata with safe model/channel identifiers.
6. Return response meta for the member inspector.

## UI Contract

- Admin page should expose channel assignment as an operator control, not as secret editing.
- Member page should show assigned channel and answer channel separately so users can detect fallback/degraded responses.
- Copy should be concise and product-like; no large explanatory blocks.

## Safety

- No `.env` reads.
- No live provider checks.
- No API key/base URL exposure in logs, JSON, UI, task files, or docs.
- Production setup remains a manual gate: env vars, database migration, real model task validation, and access policy.

## Rollback

If implementation uncovers risky schema or API gaps, keep the current MVP intact and limit this child to audit notes, tests, and manual actions.
