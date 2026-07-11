# Acceptance

## Root Cause

The archive root intentionally contains more than 1,000 local-only historical files while only a small curated subset is tracked. Removing the ignore rule would expose the whole local archive. Plain `git add` could not stage a newly moved tracked task into that ignored destination, leaving deletion-only status and a failed auto-commit.

## Resolution

- Historical archives remain ignored by default.
- `safe_archive_paths_to_add()` resolves only the concrete `<month>/<task>` destination.
- `safe_git_add_exact_archives()` rejects archive roots, wildcards, traversal, runtime paths, and non-existent directories before its narrow force-add.
- Ordinary task and child paths continue to use plain `git add`.
- `npm.cmd run trellis:archive-check` is included in `npm.cmd run verify`.

## Production-shaped Regression

The previously failed `07-11-multi-theme-luminous-motion-system` archive was replayed through `_auto_commit_archive()` and produced commit `aa1d4c9` with exactly seven source-to-archive renames. No unrelated local archive, runtime, workspace, cache, or backup file entered the commit.

## Checks

- `npm.cmd run trellis:archive-check`
- `python -m py_compile scripts/check-trellis-archive-tracking.py .trellis/scripts/common/safe_commit.py .trellis/scripts/common/task_store.py`
- `npm.cmd run lint`
- `git diff --check`
