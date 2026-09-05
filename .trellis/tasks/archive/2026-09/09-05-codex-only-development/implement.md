# Implementation

- [x] Inspect current entry points, task state, template registry, and worktrees.
- [x] Capture protected-file baselines and back up current guides/configs.
- [x] Switch project instructions and Trellis to Codex inline development.
- [x] Move Claude-only project entry points to recoverable local storage.
- [x] Repair current documentation references and retain useful generic guidance.
- [x] Parse configs and exercise the real Codex hook and phase context loader.
- [x] Run lint, build, and `git diff --check`; verify protected-file hashes.
- [x] Record recovery location, final checks, and preserved worktrees.

Owned: `AGENTS.md`, `README.md`, `.gitignore`, `.trellis/config.yaml`,
`.trellis/workflow.md`, frontend/backend spec indexes, the Codex workflow and
repository-packaging guides, removed Claude entry points, and this task folder.

No application edits, pushes, deployments, or worktree deletions. The user
approved local migration and bookkeeping commits in the follow-up. Preserve
the previous UI task and all pre-existing dirty files.

Validation is scoped to tooling and documentation. Previously passing browser
UI suites are historical evidence; no UI change in this task requires rerunning
their full matrix.

## Validation Results

- The primary Codex config and three agent TOML files parse successfully.
  `project_doc_fallback_filenames` remains exactly `["AGENTS.md"]`.
- `.trellis/config.yaml` parses successfully and selects `inline`.
- The registered Codex workflow hook resolves this active task, emits
  `<codex-mode>inline:...`, and includes the sole-owner execution rule.
- `get_context.py --mode phase --step 2.1 --platform codex` resolves the inline
  path: load guidelines, read task context, implement and verify in the main session.
- `task.py validate` passes with one real implement-context entry and one real
  check-context entry.
- Current instructions, `.codex/`, project specs, scripts, and CI contain no
  references requiring `CLAUDE.md` or the retired collaboration commands.
- `npm.cmd run docs:manual-gates-check`, `npm.cmd run lint`, and
  `npm.cmd run build` pass. The build includes the TypeScript project check.
- `git diff --check` passes. Git reports only the existing LF-to-CRLF policy
  warnings; no whitespace errors were reported.
- All 22 protected files match their pre-migration SHA-256 baselines, including
  the existing UI edits, continuous UI task, public status data, Codex config,
  hooks registration, template registry, and legacy screenshot evidence.
- At the end of initial validation, the Git index was unchanged and empty.
  Branch `main` was at `2367481296f604755f36a9054deded84f957db50`; no commit,
  push, or deployment had run.
- Before the approved closeout, lint, build, the manual-gates check, task
  manifests, Codex TOML parsing, and the real inline workflow hook passed again.
  Existing Git hooks contain no active scripts that could publish on commit.

## Recovery And Retained Material

Recovery directory:

`D:/Agent/codex/backups/blog-semi-codex-only-20260905-233529-6f3e3ba1`

Seventeen files were verified against their original SHA-256 hashes after
copying or moving: nine pre-edit guides/configs and eight retired Claude entry
files. Relative paths are preserved. The local permissions file is backed up
without publishing its contents. Restore only selected files after comparing
with the current checkout; do not overwrite subsequent work blindly.

All four historical worktrees listed in `design.md` remain registered and
unchanged. Application Logo Lab assets and historical task records are retained.
No disposable task files remain to remove. The pre-existing directory named
` .trellis/` (with a leading space) is retained because it contains earlier
evidence and is not owned by this migration.

Implementation and verification are complete. The user approved the scoped
local migration commit followed by task archive and session-journal commits.
The session journal records the resulting work commit. The continuous UI task
is excluded from this closeout and was not modified or resumed.
