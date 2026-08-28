# Branch And Worktree Audit

## Snapshot

- `main` is at `27b276a4` and is three commits ahead of `origin/main` before this cleanup task is committed.
- `claude/blog-semi-claude-dev` is clean and aligned with `main`; keep it for Claude Code handoff.
- `D:\workspace4Cursor\blog-semi-public-route` is on `codex/public-assistant-ancient-poem-route` at `70d55305` with two uncommitted files.
- Every local branch tip is an ancestor of current `main`; `git branch --no-merged main` is empty.

## Uncommitted Public Route Draft

Files:

- `server/src/publicAssistantAgent.ts`: simple three-attempt generation retry, fixed 180/360ms delays, a 5s remaining-budget gate, and retryable failure classification.
- `server/scripts/public-assistant-agent-check.ts`: two checks for third-attempt success and `not_configured` single-attempt behavior.

Current `main` contains a later, broader implementation:

- bounded 1/2/3 attempts through `env.publicAssistantModelMaxAttempts`;
- abortable 200/400ms retry delays;
- total request and per-attempt budget reservation;
- retry relation classification for independent fallback and same failure domains;
- permanent failure, insufficient budget, cancellation, recovery metadata and observability coverage;
- tests for recovered/degraded outcomes, network and HTTP classes, independent fallback, same-failure-domain behavior, non-retryable failures, budget exhaustion, and abortable backoff.

Evidence:

- The old test-file patch applies to `main`, but the old implementation conflicts with the later implementation.
- `npm.cmd run assistant:public-agent-check` passes on current `main` and exercises the broader recovery contract.

Conclusion: the two uncommitted files are a superseded draft. Their intended behavior is already implemented more completely on `main`; they should not be committed or ported. Discard remains irreversible from Git because the draft has never been committed, so explicit user approval is required before restoring the files and removing the worktree.

## Branch Retention

Keep:

- `main`
- `claude/blog-semi-claude-dev`
- `codex/public-assistant-main-integration` because active task `08-04-public-assistant-cloudflare-model-relay` still records it as `base_branch`.

Delete after approval:

- `codex/project-notes-zh-expansion` at `6c8f5920`
- `codex/public-assistant-ancient-poem-route` at `70d55305`, after its worktree is cleanly removed
- `codex/public-assistant-productization` at `426d691a`
- `codex/public-assistant-provider-fallback` at `e721d423`
- `codex/public-assistant-reliability-v2` at `043f8516`
- `codex/public-assistant-ui-polish` at `8ed124db`
- remote `origin/codex/public-assistant-ui-polish` at `8ed124db`

All deletion candidates are already ancestors of `origin/main`. Their committed history remains recoverable from `main`; the recorded tip SHAs also allow recreating a local branch if needed.
