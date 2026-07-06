# Cross-project Autonomous Improvement Round 4 Implementation Plan

## Default Order

1. Start parent task after planning artifacts are present.
2. Start and execute `07-07-round-4-reliability-status-synthetic`.
3. Continue with `07-07-round-4-assistant-studio-ai-daily`.
4. Continue with project detail evidence and P1 project-specific tasks.
5. Use P2 tasks when all available P1 work is complete or manually gated.

## Per-child Execution Protocol

- Read child `prd.md`.
- Load `trellis-before-dev` before editing.
- Inspect local repo state and project-specific instructions.
- Keep changes narrowly scoped and public-safe.
- Run the smallest relevant validation first, then broader checks when data, routes, or UI changed.
- Update `manual-gates.md` for anything requiring user/platform action.
- Commit successful child slices before moving to the next repository.

## Default Validation Matrix

- `blog-semi`: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `npm.cmd run site:status`, `npm.cmd run reliability:check`, plus affected synthetic commands.
- ERP: project-local lint/build/test/smoke; production registration checks only when safe config exists.
- Legal RAG: health/smoke/eval paths using public-safe demo data; credentialed checks only with user-provided low-privilege demo token/password.
- Pet: showcase synthetic, APK gate audit, release artifact inspection; never publish debug APK.
- Xunqiu: static showcase checks, backend health/smoke when base URL is configured, APK/document consistency.
- Playlab/Game: static entry checks, Web trial resource checks, mobile hint/UI screenshot regression where available.

## Manual Gate Handling

Do not stop the long task for one gate. Record:

- what is blocked;
- exact platform/service where the user must act;
- safe field names to check;
- validation to rerun afterward.

Then continue to the next available local slice.

## Completion

The parent task is complete only when all children are completed or explicitly deferred with manual gates, main-site integration is refreshed, checks are recorded, and journal/spec updates are committed.

## Final Execution Record

- Completed all 8 child tasks in this round.
- Refreshed main status artifacts after the last reliability run:
  - `public/status/blog-semi-synthetic.json`
  - `public/status/legal-rag-synthetic.json` was preserved because live credentials/base URL are not configured locally.
  - `public/status/erp-synthetic.json`
  - `public/status/xunqiu-synthetic.json`
  - `public/status/pet-gamer-synthetic.json`
  - `public/status/biau-playlab-synthetic.json`
  - `public/status/site-status.json`
  - `public/status/reliability-suite.json`
- Latest `reliability:check` evidence: 6 passed, 1 failed, 1 skipped. The failed step is `site-status` because the Legal RAG public entry currently reports a low-sensitive timeout. This is recorded in `manual-gates.md` for Render/platform follow-up.
- No approved release APK has been published for Pet or Xunqiu; their status remains gated.
- No model liveness probes were run.
