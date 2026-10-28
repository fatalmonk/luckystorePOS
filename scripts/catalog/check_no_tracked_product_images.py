#!/usr/bin/env python3
"""Fail when product packshots are tracked outside reviewed metadata."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from image_library import tracked_product_image_paths


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        print("Unable to enumerate tracked files", file=sys.stderr)
        return result.returncode
    paths = [path.decode("utf-8", errors="replace") for path in result.stdout.split(b"\0") if path]
    # `git ls-files` still lists unstaged deletions in a local worktree. Check
    # the checked-out tree so a planned removal is not reported as still present.
    findings = tracked_product_image_paths(path for path in paths if (root / path).is_file())
    if findings:
        print("Tracked product image files are not allowed:", file=sys.stderr)
        print("\n".join(findings), file=sys.stderr)
        return 1
    print("No tracked product packshots found in product image directories.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
