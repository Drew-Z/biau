# Codex-Only Development Design

## Execution

Use `AGENTS.md` as the primary project instruction entry, `.codex/` for Codex
integration, `.agents/skills/` for shared skills, and `.trellis/` for task/spec
state. Set `codex.dispatch_mode` to `inline` so the main session implements and
verifies directly. Optional read-only exploration follows the user's agent
constraints. Do not invoke Claude background runners or create Claude leaves.

Keep the upstream multi-platform Trellis parsers and bundled references intact.
Their descriptions of other platforms do not enable those platforms. The local
workflow header and Codex inline breadcrumb state the active project policy.
The template hash registry has no Claude file entries and needs no edits.

## Removal And Recovery

Move exactly `CLAUDE.md` and `.claude/` out of the canonical checkout into a
unique local recovery directory. Preserve local permissions without displaying
their contents. Back up each modified current guide/config before editing.
Add the removed namespace to Git ignore so local legacy config is not published.

Synchronize the frontend/backend spec indexes and repository-packaging guide.
Migrate still-useful inventory, validation, and UI-review guidance to the Codex
development guide. Keep all historical task/log records unchanged.

## Preserved Worktrees

All paths below are under `D:/Agent/codex/worktrees/`.

| Worktree | Unique commits vs main | Untracked work | Decision |
| --- | --- | --- | --- |
| blog-semi-claude-dev | 3 | Two V2 Logo files | Preserve |
| blog-semi-logo-fluid | 0 | Two Logo Lab files | Preserve |
| blog-semi-logo-v3 | 0 | None | Preserve; task usage not established |
| blog-semi-logo-v3-retry | 1 | None | Preserve |

Existing `ClaudeLogo*` components are visual comparison assets, not execution
configuration. No application file, public status payload, machine-level
tooling, legacy evidence, or existing task is part of the removal.
