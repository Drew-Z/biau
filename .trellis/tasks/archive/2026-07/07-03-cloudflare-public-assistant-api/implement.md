# Implementation Plan

## Steps

1. Read relevant frontend/backend specs and Cloudflare Pages Functions docs.
2. Add shared Cloudflare function helper with public knowledge search, fallback, and OpenAI-compatible request.
3. Add `/api/health` and `/api/chat/public` handlers.
4. Add a Node smoke script that imports function handlers and tests unconfigured fallback, mock model success, and provider failure.
5. Update `.env.example`, deployment docs, and package scripts.
6. Run validation and sensitive scan.
7. Update specs if the same-domain Pages Function contract should be preserved.
8. Commit, push, archive task.

## Validation

- `npm.cmd run assistant:index`
- `npm.cmd run cf-assistant:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- Sensitive scan for keys, real relay URLs, and the previously shared GLM key.
