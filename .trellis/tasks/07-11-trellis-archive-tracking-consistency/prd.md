# Trellis archive tracking consistency

## Goal

Keep task archives Git-tracked so task.py archive auto-commit remains reliable, while runtime and workspace state stay local-only.

## Background

- Trellis defaults `session_auto_commit` to enabled and `task.py archive` expects the active task and its archive destination to be stageable.
- The repository already tracks historical files under `.trellis/tasks/archive/`.
- Both the root `.gitignore` and `.trellis/.gitignore` currently ignore new archive files, so a newly tracked task moved into the archive appears as deletion-only and the auto-commit fails.
- Runtime state such as `.trellis/.runtime/`, `.trellis/workspace/`, temporary files, backups, and developer identity must remain local-only.

## Requirements

- Preserve the archive-root ignore rules so historical local-only task files do not flood Git status or enter the public repository.
- Preserve all runtime, workspace, backup, temporary, and developer-specific ignore rules.
- Change archive staging to target only `.trellis/tasks/archive/<month>/<current-task>` and validate that exact shape before a guarded force-add.
- Reject archive-root, wildcard, traversal, runtime, workspace, backup, and non-existent paths from guarded force staging.
- Add an offline regression check that validates the ignore boundary and exact archive path guard.
- Integrate the check into the existing verification surface without invoking networks, models, or cloud services.
- Reconcile the already archived `07-11-multi-theme-luminous-motion-system` task as a Git rename and complete its pending archive commit.
- Verify a representative archive path is not ignored while representative runtime paths remain ignored.

## Acceptance Criteria

- [x] Historical `.trellis/tasks/archive/**` paths remain ignored by default.
- [x] `.trellis/.runtime/`, `.trellis/workspace/`, and `.trellis/.developer` remain ignored.
- [x] A repository check prevents the archive/runtime boundary from regressing.
- [x] The pending luminous-motion task archive is committed as a rename rather than deletion-only.
- [x] Relevant checks and `git diff --check` pass.
- [x] Future `task.py archive` auto-commit force-stages only its validated exact destination and never the archive root.

## Out Of Scope

- Changing Trellis task lifecycle semantics.
- Tracking developer journals or runtime session state.
- Rewriting historical archive commits.
- Bulk-adding the 1,000+ existing local-only archive files.
