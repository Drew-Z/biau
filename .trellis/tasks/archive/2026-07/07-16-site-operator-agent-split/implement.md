# Implementation Plan

- [x] Select Cloudflare Access + same-origin Operator API facade as the final owner authentication boundary.
- [x] Fix the final product name and routes as `泊岸站务 / BIAU Operator`, `/operator`, `/operator/settings`, and `/api/operator/*`, with no compatibility pages for the old private routes.
- [x] Link Chatus productization to its independent task at `D:\workspace4Cursor\chatus\.trellis\tasks\07-16-team-agent-productization`.
- [x] Fix the memory policy: migrate only explicitly identified site-owner `ACTIVE` long-term memories; exclude chats, invitations, teammate records, member channels, usage data, and ambiguous records.
- [ ] Identify the exact production owner-memory record IDs through a redacted migration report before any destructive schema cleanup. This remains a production manual gate tracked in `docs/manual-gates.md` and `07-14-manual-gates-closure`.
- [x] Audit current frontend/backend/database contracts and map every member/invite/channel surface to retain, replace, migrate, or remove.
- [x] Introduce the owner principal and Site Operator API/auth boundary without exposing reusable service credentials to the browser.
- [x] Refocus LangGraph prompts, planner intent, tool registry, traces, empty states, and documentation around website operation tasks.
- [x] Add deterministic Site Operator tools for site/project/content/layout/status inspection while retaining review-only `studio.draft`.
- [x] Replace `/assistant` and `/assistant/admin` teammate-oriented surfaces with the final owner workspace and owner settings/diagnostics surface.
- [x] Add redacted owner-memory check/apply tooling and stop invitation/member/channel/quota writes from the Operator runtime; production apply remains a manual gate.
- [x] Remove obsolete teammate runtime and UI. Retain legacy member tables only as rollback/migration sources until the production memory gate and database backup are accepted.
- [x] Record the Chatus active-liveness policy and productization scope in its existing Chatus-owned Trellis task; do not modify Chatus from this task.
- [x] Prepare truthful future catalog/status/knowledge requirements for Chatus and Learn, but defer public data changes until stable user-approved evidence exists.
- [x] Reconcile deployment, architecture, manual-gate, open-source, and operator runbook documentation.
- [x] Run deterministic backend/Agent/UI/docs/lint/build checks in BIAU without model probes. Chatus validation remains in its own task; Learn was not touched or tested.
- [x] Review platform/manual migration gates, then activate implementation only after explicit user approval.

## Final Verification

- `npm.cmd run verify` passed on 2026-07-16 with `modelCalls=0`.
- Operator Agent contract and eval passed; service-mode isolation and Cloudflare facade smoke passed.
- Prisma validate/generate, server build/smoke, lint, production build, performance budget, docs, Studio, status contract, and UI checks passed.
- UI check covered 16 routes across desktop and mobile, including `/operator`, `/operator/settings`, and NotFound behavior for both legacy private routes.
- Operator CSS is route-split: public initial CSS is 219,948 / 240,000 bytes.
- `git diff --check` reported no whitespace errors; only repository line-ending notices were emitted.

## Validation Shape

### BIAU

```powershell
npm.cmd run assistant:agent-contract
npm.cmd run assistant:agent-eval
npm.cmd run assistant:admin-check
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run check:ui
npm.cmd run docs:deployment-check
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

### Chatus

No commands that mutate, validate, commit, or deploy Chatus run from this task. Its independent `07-16-team-agent-productization` task must load `D:\workspace4Cursor\chatus\AGENTS.md`, use Chatus validation commands, and preserve its GitHub-Actions-only production deployment contract.

### Learn

Read-only evidence only. Do not run Flutter commands, formatting, code generation, tests that generate tracked files, Git staging, cleanup, or any write operation while the concurrent worktree is active.

## Risk Controls

- Do not delete member/invite/channel tables before owner memory and session migration is verified.
- Do not use the browser to hold a Render service credential.
- Do not share Chatus or Learn private state with BIAU.
- Do not edit, stage, push, or deploy Chatus from this task.
- Do not edit, format, generate, stage, commit, clean, or revert any Learn WIP file.
- Do not perform active model health checks or live provider diagnostics.
