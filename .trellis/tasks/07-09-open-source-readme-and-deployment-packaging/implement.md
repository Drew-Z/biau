# Open-Source README And Deployment Packaging Implementation Plan

## Phase 1: Shared Template And Audit

- [x] Create a reusable README checklist/template in `docs/` or the task directory.
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

Progress:

- `docs/open-source-repository-packaging.md` now defines the reusable README/checklist contract.
- `docs/open-source-repository-audit.md` records the initial multi-repo audit table and a completed Legal RAG evidence pass.

Audits may be done in parallel because they are read-heavy and repository-scoped. Shared template edits and final priority decisions stay sequential.

Recommended priority:

1. `legal-rag`
2. `blog-semi`
3. `erp`
4. `xunqiu` / `xunqiu-backend-modern`
5. `pet`
6. `game`

## Phase 2: First Repository Slice

- [x] Create child task for the first repo.
- [x] Read local repo rules before editing.
- [x] Verify quick-start/build/test commands.
- [x] Rewrite README with open-source structure.
- [x] Add or update `.env.example` / setup docs if missing.
- [x] Add safe architecture diagram if helpful.
- [x] Commit in that repository only after checks pass.

Legal RAG validation passed:

```powershell
npm.cmd run typecheck
npm.cmd --workspace apps/api run test:unit
npm.cmd --workspace apps/api run validate
npm.cmd --workspace apps/api run evaluate
npm.cmd --workspace apps/api run evaluate:review
npm.cmd run build
docker compose -f docker-compose.prod.yml config
```

Inline child artifact: `slices/legal-rag.md`.

Legal RAG slice committed and pushed:

- Repository branch: `codex/project-quality-dashboard`
- Commit: `7d8470c docs: package legal rag for open-source use`

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

Progress:

- `blog-semi` root README first slice is complete; slice artifact: `slices/blog-semi.md`.
- `erp` README and deployment safety first slice is complete; slice artifact: `slices/erp.md`.
- `xunqiu` static showcase and `xunqiu-backend-modern` README/deployment packaging first slice is complete; slice artifact: `slices/xunqiu.md`.
- `pet` static app showcase README sub-slice is complete; broader Pet README packaging is gated by existing dirty worktrees; slice artifact: `slices/pet.md`.

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
