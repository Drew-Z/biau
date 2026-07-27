# Public assistant productization implementation

## Implementation Checklist

- [x] Add the nullable display snapshot Prisma migration and public-safe serializer/parser.
- [x] Add bounded session summary/read/delete persistence operations with expiry checks.
- [x] Register public session routes, rate limits, stable errors, and no-store responses.
- [x] Add Cloudflare Pages same-origin proxy functions for session list/read/delete.
- [x] Extend the browser API normalizers and low-sensitive transport error classification.
- [x] Add a bounded local session registry and restore/delete/new-session behavior.
- [x] Add desktop compact/fullscreen and mobile fullscreen shell controls and history drawer.
- [x] Fix the message scroll container, near-bottom behavior, soft-keyboard layout, focus, Escape, and body scroll lock.
- [x] Extend deterministic persistence/API/service-mode/Cloudflare/UI checks.
- [x] Update the public assistant Trellis spec with the history and surface contracts.

## Validation

```powershell
npm.cmd run prisma:format
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-rate-limit-check
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run cf-assistant:smoke
npm.cmd run lint
npm.cmd run build
```

Run the targeted Playwright UI check at desktop and 320/390/430 mobile widths. Deterministic checks must not call a live model, search, embedding, reranker, or vector database provider.

## Risk And Rollback Points

- Snapshot serialization is the primary data-safety boundary; reject unexpected shapes rather than persisting raw output.
- Switching sessions during an active stream can corrupt history unless completion is scoped to the captured session.
- Fullscreen scroll locking must be restored on every close/unmount path.
- Cloudflare route names and server route names must remain identical; contract checks cover both.
