# AI Daily Studio Authoring Flow Implementation Plan

## Steps

1. Inspect AI Daily and Studio files, scripts, docs, and specs.
2. Choose the smallest improvement that strengthens the workflow.
3. Implement narrowly.
4. Run focused validation:
   - related Studio / AI Daily check or smoke script;
   - `npm.cmd run lint`;
   - `npm.cmd run build`;
   - `npm.cmd run check:ui` if visible Studio/issue UI changed;
   - `git diff --check`;
   - targeted sensitive scan.
5. Commit and push on `main` if checks pass.

## Rollback

Revert the small script/UI/docs change from this child task. Do not change production data or run live model generation.

## Result

- Added `npm run studio:smoke` to the top-level `verify` chain after `blog:check` and before `project-details:check`.
- Kept the improvement limited to deterministic local checks: Studio export sample dry-run, project detail plan sample, status detail plan sample, and offline AI Daily draft sample written to the system temp directory.
- No model/provider liveness probe, external fetch, production token, or database-dependent check was added.

## Validation

- `npm.cmd run studio:smoke` passed.
- `npm.cmd run verify` passed.
- `git diff --check` passed with line-ending warnings only.
- Targeted sensitive scan over changed/untracked files passed after whitelisting the local preview URL `http://127.0.0.1`.

## Manual Gates

- Production Studio / AI Daily still needs platform variable verification, database migration confirmation, `/studio/api/health` verification with a Studio token, and first real issue-to-hidden-draft review.
- Real model-assisted AI Daily generation remains an explicit human-approved content task, not a default smoke check.
