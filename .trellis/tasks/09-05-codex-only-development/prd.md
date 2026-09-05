# Codex-only project development

## Goal

Remove project-local Claude Code entry points and make Codex the sole development owner while preserving existing UI work and historical worktrees.

## Requirements

- Codex is the only active development platform for this project. The main
  Codex session owns implementation and final verification.
- Remove the root Claude Code guide and the project-local Claude command and
  permission directory after preserving a recoverable copy outside the repo.
- Keep the Codex config, hooks, shared skills, and Trellis task/spec workflow
  functional without a Claude executable or project directory.
- Replace current development-document dependencies on the retired guide.
- Preserve application assets, historical records, old worktrees, and all
  pre-existing uncommitted UI changes.

## Acceptance Criteria

- [x] `CLAUDE.md` and `.claude/` are absent from the canonical checkout.
- [x] `AGENTS.md` and the development guide describe Codex-only ownership.
- [x] Trellis resolves the Codex inline implementation/check workflow.
- [x] No live project instructions require the removed Claude entry points.
- [x] Backup hashes and pre-existing UI file hashes match their baselines.
- [x] Config parsing, Codex hook/context checks, lint, build, and diff checks pass.

## Notes

- The user directly requested this migration; no new product choice is needed.
- Scope is project-local tooling, not machine-wide CLI uninstallation or model
  providers used by the application.
- The initial implementation stayed uncommitted. In the follow-up, the user
  approved a scoped local migration commit, task archive, and session record.
  Pushes and deployment remain out of scope.
- The continuous UI task remains available with its existing evidence.
