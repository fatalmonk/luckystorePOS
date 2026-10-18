from __future__ import annotations

import re
import subprocess
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Run secrets audit using existing repository secret_scan.js."""
    start_time = time.time()
    findings: list[Finding] = []
    scanner_path = repo_root / "scripts" / "security" / "secret_scan.js"

    if not scanner_path.is_file():
        return ModuleResult(
            module="secrets",
            passed=False,
            findings=[
                Finding(
                    module="secrets",
                    severity=Severity.CRITICAL,
                    title="Secret Scanner Missing",
                    message=f"Missing scanner script at {scanner_path}",
                )
            ],
            duration_ms=(time.time() - start_time) * 1000,
        )

    cmd = ["node", str(scanner_path)]
    if quick or ci:
        cmd.append("--staged")

    res = subprocess.run(
        cmd,
        cwd=repo_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    output = res.stdout + res.stderr

    # Parse potential findings: "FAIL: <path>:<line> (<rule>)"
    fail_pattern = re.compile(r"FAIL:\s*([^:\s]+):?(\d+)?\s*(?:\(([^)]+)\))?")
    for line in output.splitlines():
        match = fail_pattern.search(line)
        if match:
            file_path = match.group(1)
            line_num = int(match.group(2)) if match.group(2) else None
            rule = match.group(3) or "Secret Detected"
            findings.append(
                Finding(
                    module="secrets",
                    severity=Severity.CRITICAL,
                    title="Potential Secret Committed",
                    message=line.strip(),
                    file_path=file_path,
                    line=line_num,
                    suggestion="Remove token/key, revoke credential if leaked, and use environment variables.",
                    rule_id=rule,
                )
            )

    passed = (res.returncode == 0) and len(findings) == 0
    return ModuleResult(
        module="secrets",
        passed=passed,
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
