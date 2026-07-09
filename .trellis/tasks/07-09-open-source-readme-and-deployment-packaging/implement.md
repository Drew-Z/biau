# Open-Source README And Deployment Packaging Implementation Plan

## Phase 1: Shared Template And Audit

- [ ] Create a reusable README checklist/template in `docs/` or the task directory.
- [ ] Audit each target repo for:
  - current README state
  - real tech stack
  - local start command
  - env examples
  - deploy config
  - tests/builds
  - screenshots/diagrams
  - manual gates
- [ ] Prioritize repositories by public usefulness and readiness.

Audits may be done in parallel because they are read-heavy and repository-scoped. Shared template edits and final priority decisions stay sequential.

Recommended priority:

1. `legal-rag`
2. `blog-semi`
3. `erp`
4. `xunqiu` / `xunqiu-backend-modern`
5. `pet`
6. `game`

## Phase 2: First Repository Slice

- [ ] Create child task for the first repo.
- [ ] Read local repo rules before editing.
- [ ] Verify quick-start/build/test commands.
- [ ] Rewrite README with open-source structure.
- [ ] Add or update `.env.example` / setup docs if missing.
- [ ] Add safe architecture diagram if helpful.
- [ ] Commit in that repository only after checks pass.

Recommended first implementation slice remains a single repository so the template quality can be proven before repeating it broadly.

## Phase 3: Repeat Per Repository

For each repo:

- [ ] Inspect source.
- [ ] Fix stale claims.
- [ ] Add verified quick start.
- [ ] Add deployment section.
- [ ] Add testing section.
- [ ] Add roadmap/security/license section.
- [ ] Record manual gates.
- [ ] Commit/push according to repo rules.

Repository slices can be implemented concurrently only in separate worktrees/sessions and only when they do not touch shared `blog-semi` data. In this inline session, execute one slice at a time.

## Phase 4: Main Site Sync

- [ ] If project public facts changed, update BIAU Port project detail/status data.
- [ ] Run:

```powershell
npm.cmd run assistant:index
npm.cmd run project-details:check
npm.cmd run public-links:check
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
```

## Phase 5: Final Review

- [ ] Produce a summary table:
  - repository
  - README status
  - quick-start status
  - deployment status
  - tests run
  - manual gates
- [ ] Ensure no README contains secrets or private endpoints.
- [ ] Ensure no project falsely claims one-click deploy.

## Validation Notes

Use each repository's own commands. For the main repo, run `npm.cmd run verify` if public project data or status data changes broadly.
