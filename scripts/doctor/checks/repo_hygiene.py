from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity

FORBIDDEN_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
FORBIDDEN_EXTS = {".orig", ".rej", ".bak", ".swp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Audit repo hygiene: OS clutter, merge artifacts, and oversized tracked files."""
    start_time = time.time()
    findings: list[Finding] = []

    # Get tracked files from git
    cmd = ["git", "ls-files"]
    if quick or ci:
        cmd = ["git", "diff", "--name-only", "--cached"]

    res = subprocess.run(cmd, cwd=repo_root, stdout=subprocess.PIPE, text=True)
    tracked_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    # If quick mode and nothing staged, check unstaged changed files
    if (quick or ci) and not tracked_files:
        res = subprocess.run(["git", "diff", "--name-only", "HEAD"], cwd=repo_root, stdout=subprocess.PIPE, text=True)
        tracked_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    for rel_path in tracked_files:
        full_path = repo_root / rel_path
        file_name = full_path.name
        suffix = full_path.suffix.lower()

        # Check OS clutter
        if file_name in FORBIDDEN_FILES:
            findings.append(
                Finding(
                    module="repo_hygiene",
                    severity=Severity.HIGH,
                    title="Tracked OS Clutter",
                    message=f"OS clutter file '{rel_path}' is tracked by git.",
                    file_path=rel_path,
                    suggestion=f"Run: git rm --cached '{rel_path}'",
                    rule_id="hygiene-os-clutter",
                )
            )

        # Check merge / backup leftovers
        if suffix in FORBIDDEN_EXTS:
            findings.append(
                Finding(
                    module="repo_hygiene",
                    severity=Severity.HIGH,
                    title="Tracked Backup / Merge Artifact",
                    message=f"Artifact file '{rel_path}' is tracked by git.",
                    file_path=rel_path,
                    suggestion=f"Remove '{rel_path}' and add extension to .gitignore",
                    rule_id="hygiene-merge-leftover",
                )
            )

        # Check large files
        if full_path.is_file():
            try:
                size = full_path.stat().st_size
                if size > MAX_FILE_SIZE_BYTES:
                    size_mb = round(size / (1024 * 1024), 2)
                    findings.append(
                        Finding(
                            module="repo_hygiene",
                            severity=Severity.MEDIUM,
                            title="Oversized File Tracked",
                            message=f"File '{rel_path}' is {size_mb}MB (exceeds 5MB limit).",
                            file_path=rel_path,
                            suggestion="Compress file, host in Cloudflare R2 / CDN, or track via Git LFS.",
                            rule_id="hygiene-oversized-file",
                        )
                    )
            except OSError:
                pass

    return ModuleResult(
        module="repo_hygiene",
        passed=sum(1 for f in findings if f.severity in (Severity.CRITICAL, Severity.HIGH)) == 0,
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
