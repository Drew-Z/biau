# BIAU Port continuous improvement implementation plan

## Phase 1: Parent Task Setup

- [x] Create parent task.
- [x] Link public assistant frontier RAG task as child.
- [x] Link cross-project release readiness parent task as child.
- [x] Write parent `prd.md`.
- [x] Write parent `design.md`.
- [x] Write parent `implement.md`.
- [x] Write parent `manual-actions.md`.
- [x] Run `git diff --check`.
- [x] Report the task tree and manual-action queue to the user.

## Phase 2: Review Child Task Readiness

- [ ] Apply child-first stabilization rule: do not create new implementation work until existing `P1` children are reviewed, started, blocked, or intentionally deferred.
- [ ] Review public assistant frontier RAG artifacts.
- [ ] Review cross-project release readiness tree.
- [ ] For each related repository that may be edited, read local guidance before planning implementation:
  - [ ] `D:\workspace4Cursor\erp`
  - [ ] `D:\workspace4Cursor\legal-rag`
  - [ ] `D:\workspace4Cursor\pet`
  - [ ] `D:\workspace4Codex\xunqiu`
  - [ ] `D:\workspace4Codex\xunqiu-backend-modern`
  - [ ] `D:\workspace4Cursor\game`
- [ ] Review `P1` child readiness in this order:
  - [ ] ERP production registration live verify.
  - [ ] Legal RAG demo access QA closure.
  - [ ] Pet APK public release closure.
  - [ ] Cross-project scheduled reliability observability.
- [ ] Run a discovery sweep across main site data/routes and related project references.
- [ ] Identify which child tasks can proceed without manual actions.
- [ ] Identify which child tasks are blocked by manual actions.
- [ ] Create or update child tasks for discovered gaps with independent deliverables.
- [ ] Update `manual-actions.md`.

## Phase 3: Continuous Autonomous Work Loop

Repeat while the user is away and context/time allows:

1. Check `git status --short`.
2. Check Trellis active tasks.
3. Run a discovery sweep when no obvious in-progress child is available.
4. Pick the highest-value unblocked child task or create/update one for a newly found gap.
5. Load relevant specs before editing.
6. Implement in a small, verifiable slice.
7. Run local validation.
8. Update task artifacts and specs if a reusable rule was learned.
9. Commit and push on `main` when checks pass and the project rules allow it.
10. Record any manual action encountered.

When the selected slice touches a related repository:

1. Enter only the target repository needed for the slice.
2. Read local rules and scripts before edits.
3. Keep changes narrowly tied to the cross-project outcome.
4. Run that repository's smallest relevant validation first, then broader validation when risk justifies it.
5. Keep commits per repository; do not mix unrelated repositories in one commit.

## Discovery Sweep Checklist

- [ ] Compare homepage/project cards with `src/data/portfolio.ts`.
- [ ] Compare project detail content with assistant knowledge projections.
- [ ] Compare status targets/checks with project external links and detail pages.
- [ ] Inspect blog curation for project-related gaps or stale references.
- [ ] Inspect public assistant suggestions and retrieval coverage.
- [ ] Review related repo paths as needed for evidence and direct low-risk fixes tied to demo readiness, status accuracy, or build confidence.
- [ ] Record manual blockers in `manual-actions.md`.
- [ ] Create child tasks for gaps that need separate planning/validation.

## Recommended First Autonomous Work Items

Current override: the user asked to finish the public assistant first. While
this override is active, select `07-04-public-assistant-kg-lite` before the
release-readiness P1 sequence, but still keep production model/RAG/deployment
steps behind manual gates.

1. ERP registration display and main-site sync review
   - Why: user repeatedly called out registration availability and demo usability.
   - Allowed related-repo work: login/register UI polish, role-safety copy, local registration smoke, README/demo wording.
   - Manual dependency: live production verification if credentials/deployment needed.
   - Risk: medium.
2. Legal RAG demo access and status wording closure
   - Why: user reported the demo route was still blocked by login and wants legal Q&A monitored.
   - Allowed related-repo work: login-gate copy, safe demo credential surface, smoke-script clarity, quality-panel display readiness.
   - Manual dependency: public credential/access policy if live checks are needed.
   - Risk: medium.
3. Pet showcase APK gate page/data cleanup
   - Why: user requested homepage connection to Pet showcase and APK public release readiness.
   - Allowed related-repo work: release artifact detection, showcase/download page readiness, build notes, no public debug download.
   - Manual dependency: release APK/signing/checksum approval.
   - Risk: medium.
4. Reliability/status page route and detail polish
   - Why: user already requested status card buttons and detail routes.
   - Allowed related-repo work: smoke-script documentation and public route checks that improve status evidence.
   - Manual dependency: none for local UI/data changes.
   - Risk: low to medium.
5. Public assistant answer style cleanup
   - Why: visible quality issue already observed, but it is `P2` after current release-readiness blockers.
   - Manual dependency: none for local prompt/style/data changes; no model liveness checks.
   - Risk: low.
6. Public assistant knowledge export V2 planning / local deterministic export
   - Why: foundation for Agentic Hybrid RAG.
   - Manual dependency: none if kept local and mockable.
   - Risk: medium.
7. Xunqiu and Game/Playlab public route/build confidence
   - Why: these are public project surfaces represented by BIAU Port cards and status pages.
   - Allowed related-repo work: static site route checks, title/favicon consistency, playable/APK link clarity, docs consistency.
   - Manual dependency: production backend URL, APK release approval, or new playable release approval.
   - Risk: low to medium.

## Validation Commands By Work Type

Planning-only changes:

```powershell
git diff --check
```

Frontend/data changes:

```powershell
npm.cmd run lint
npm.cmd run build
```

Assistant changes:

```powershell
npm.cmd run assistant:index
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
```

Blog/content curation:

```powershell
npm.cmd run blog:audit
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
```

Broad release checks:

```powershell
npm.cmd run verify
```

Related project validation defaults:

```powershell
# ERP
npm.cmd run lint
npm.cmd run build

# Legal RAG
npm.cmd run lint
npm.cmd run build

# Pet
# Use the repository's discovered build/test scripts after reading local docs.

# Xunqiu / xunqiu-backend-modern
# Use static-site build checks for showcase changes and backend health/smoke tests for backend changes.

# Game / Playlab
# Use static-site build checks and playable resource checks discovered from the repo.
```

If a listed command does not exist in the target repository, inspect scripts and choose the nearest local equivalent instead of inventing a new validation path.

## Stop Conditions

Stop and record a manual action instead of continuing when work requires:

- creating or changing cloud resources;
- entering or rotating secrets;
- live model/provider liveness checks;
- production database access;
- APK signing or public release approval;
- real demo credentials;
- paid service selection;
- irreversible public deployment setting changes.
- public release approval for APK/AAB or playable binaries.
- production verification requiring real user accounts or admin access.

## Commit Policy

- Commit only after relevant validation passes.
- Push `main` after successful commit unless the user says not to.
- Keep unrelated dirty files out of commits.
- Do not install automatic Git hooks.
- For related repositories, commit and push only according to that repository's local rules and branch safety. If uncertain, leave a clean commit-ready diff and record the needed user decision.
