# Round 14 Studio draft deeplink UI guard

## Goal

Add a local UI/contract guard so /studio?draft=<id> assistant artifact links remain recognized by the Studio page without requiring live Studio credentials.

## Requirements

- R1. Add a deterministic local guard for `/studio?draft=<id>` route behavior.
- R2. The guard must not require a real Studio token, database, live API, or cloud service.
- R3. The guard should prove that a valid assistant artifact deep link is recognized by the Studio page and prompts for a Studio token instead of silently looking like a normal empty Studio page.
- R4. The guard should prove that the route remains under the `/studio` canonical page and does not expose the draft id in unsafe places.
- R5. Keep the implementation low-risk and compatible with existing `check:ui`.

## Acceptance Criteria

- [x] `npm.cmd run check:ui` visits a `/studio?draft=<safe-id>` route.
- [x] The UI check asserts the page displays the existing token-needed draft lookup message.
- [x] The UI check asserts the route canonical remains `/studio`.
- [x] Required validation commands pass.

## Out of Scope

- Creating real Studio drafts.
- Calling Studio API with a real token.
- Changing production Studio deployment or database configuration.
