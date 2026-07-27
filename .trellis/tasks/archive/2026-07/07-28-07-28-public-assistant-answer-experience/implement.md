# Public assistant answer experience implementation

## Implementation Checklist

- [x] Add `markdown-to-jsx` with raw HTML and model-authored navigation disabled.
- [x] Create the safe assistant structured-content component with code copy and bounded table/code wrappers.
- [x] Replace assistant plain-text bodies while keeping visitor messages plain text.
- [x] Separate explicit cancellation from silent abort paths and add the stop command/retry state.
- [x] Propagate external abort through the Responses adapter and block persistence after cancellation.
- [x] Add one-at-a-time structured negative-feedback reasons with Escape/focus restoration.
- [x] Add log/busy semantics and a stable non-repeating live announcement.
- [x] Extend Playwright fixtures for Markdown safety, stop/late-response isolation, feedback payloads, keyboard behavior, and 320/390/430 containment.
- [x] Update the frontend and backend public-assistant code-specs.

## Validation

```powershell
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-model-check
npm.cmd run cf-assistant:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
npm.cmd run check:ui
git diff --check
```

All checks are fixture-based. Do not send a live model, search, embedding, reranker, or vector-database request.

## Risk And Rollback Points

- Markdown links or raw HTML escaping the renderer would bypass the verified citation surface; the test fixture must include hostile links, image syntax, and HTML.
- Explicit stop and silent abort must remain separate or navigation/new-session flows will leak cancellation notices.
- A late async completion after stop must fail both controller and session fences before mutating messages.
- Feedback retry must preserve the selected reason while preventing parallel submissions for the same message.
- Dependency growth must remain isolated to the lazy assistant chunk and within the existing performance budget.
