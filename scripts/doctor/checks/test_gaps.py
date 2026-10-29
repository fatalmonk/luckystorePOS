from __future__ import annotations

import re
import subprocess
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity

TEST_PATH_RE = re.compile(
    r"(?:^|/)(?:[^/]+\.(?:test|spec)\.[^/]+|[^/]+_test\.[^/]+|test_[^/]+|__tests__(?:/|$)|tests?(?:/|$))",
    re.IGNORECASE,
)


def _is_test_path(path: str) -> bool:
    return bool(TEST_PATH_RE.search(path))


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Analyze test gaps in changed code."""
    start_time = time.time()
    findings: list[Finding] = []

    # Detect changed files
    if ci:
        # PR mode: compare against merge-base or origin/main
        cmd = ["git", "diff", "--name-only", "origin/main...HEAD"]
    else:
        # Local / quick mode: staged or unstaged
        cmd = ["git", "diff", "--name-only", "HEAD"]

    res = subprocess.run(cmd, cwd=repo_root, stdout=subprocess.PIPE, text=True)
    changed = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    # If nothing against HEAD, check staged
    if not changed:
        res = subprocess.run(["git", "diff", "--name-only", "--cached"], cwd=repo_root, stdout=subprocess.PIPE, text=True)
        changed = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    source_changes = []
    test_changes = []

    for path in changed:
        if any(path.endswith(ext) for ext in [".ts", ".tsx", ".js", ".jsx", ".dart", ".py"]):
            if _is_test_path(path):
                test_changes.append(path)
            elif any(part in path for part in ["apps/", "packages/", "supabase/functions/"]):
                source_changes.append(path)

    # Flag substantial application logic changes with 0 accompanying tests
    if len(source_changes) >= 3 and len(test_changes) == 0:
        findings.append(
            Finding(
                module="test_gaps",
                severity=Severity.MEDIUM,
                title="Application Changes Missing Regression Tests",
                message=f"Changeset modifies {len(source_changes)} source files across apps/functions without modifying or adding any test files.",
                suggestion="Add unit or integration tests for modified business logic / routes.",
                rule_id="test-gap-no-tests",
            )
        )

    return ModuleResult(
        module="test_gaps",
        passed=True,  # Test gaps are advisory (MEDIUM) in v1 to avoid false-positive blocking
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
