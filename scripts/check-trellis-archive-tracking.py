from __future__ import annotations

import subprocess
import sys
from pathlib import Path


repo_root = Path.cwd()
sys.path.insert(0, str(repo_root / ".trellis" / "scripts"))

from common.safe_commit import (  # noqa: E402
    is_safe_exact_archive_path,
    safe_archive_paths_to_add,
)


def get_ignore_match(path: str) -> str | None:
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "-v", "--", path],
        cwd=repo_root,
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(f"git check-ignore failed for {path}: {result.stderr.strip()}")
    return result.stdout.strip() if result.returncode == 0 else None


archive_probe = ".trellis/tasks/archive/2099-12/archive-contract-probe/task.json"
if not get_ignore_match(archive_probe):
    raise RuntimeError("Historical Trellis task archives should remain local-only by default")

local_only_probes = (
    ".trellis/.developer",
    ".trellis/.runtime/archive-contract-probe.json",
    ".trellis/workspace/archive-contract-probe.md",
)
for probe in local_only_probes:
    if not get_ignore_match(probe):
        raise RuntimeError(f"Trellis local runtime path must remain ignored: {probe}")

task_name = "07-11-multi-theme-luminous-motion-system"
archive_paths = safe_archive_paths_to_add(repo_root, task_name=task_name)
expected_path = f".trellis/tasks/archive/2026-07/{task_name}"
if archive_paths != [expected_path]:
    raise RuntimeError(f"Expected one exact archive path, got: {archive_paths}")
if not is_safe_exact_archive_path(expected_path, repo_root):
    raise RuntimeError("The concrete archived task path should pass the force-stage guard")
if is_safe_exact_archive_path(".trellis/tasks/archive", repo_root):
    raise RuntimeError("The archive root must never pass the force-stage guard")
if is_safe_exact_archive_path(".trellis/.runtime/probe", repo_root):
    raise RuntimeError("Runtime state must never pass the force-stage guard")

print("# Trellis archive tracking contract")
print(f"- historical archive root: ignored ({archive_probe})")
print(f"- exact archive path: guarded ({expected_path})")
print(f"- local runtime paths: ignored ({len(local_only_probes)})")
