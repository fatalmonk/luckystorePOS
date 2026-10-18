from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Audit dependencies across root and workspace apps."""
    start_time = time.time()
    findings: list[Finding] = []

    package_json_files = list(repo_root.glob("apps/*/package.json")) + [repo_root / "package.json"]
    dep_versions: dict[str, dict[str, str]] = {}

    for pkg_file in package_json_files:
        if not pkg_file.is_file():
            continue
        rel_path = str(pkg_file.relative_to(repo_root))
        try:
            with open(pkg_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            findings.append(
                Finding(
                    module="dependencies",
                    severity=Severity.HIGH,
                    title="Invalid package.json",
                    message=f"Failed to parse {rel_path}: {e}",
                    file_path=rel_path,
                )
            )
            continue

        app_name = data.get("name", rel_path)
        all_deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}

        for dep, ver in all_deps.items():
            if dep not in dep_versions:
                dep_versions[dep] = {}
            dep_versions[dep][app_name] = ver

    # Detect mismatched major versions across monorepo apps
    for dep, app_vers in dep_versions.items():
        if len(app_vers) > 1:
            unique_vers = set(app_vers.values())
            # Flag if completely different semver prefixes
            if len(unique_vers) > 1:
                # Check for major version divergence
                majors = {v.lstrip("^~").split(".")[0] for v in unique_vers if v and v[0].isdigit()}
                if len(majors) > 1:
                    app_list = ", ".join(f"{app}: {ver}" for app, ver in app_vers.items())
                    findings.append(
                        Finding(
                            module="dependencies",
                            severity=Severity.MEDIUM,
                            title=f"Mismatched Dependency Version: {dep}",
                            message=f"Conflicting versions of '{dep}' across apps: {app_list}",
                            suggestion="Align dependencies across monorepo apps to avoid bundle duplication.",
                            rule_id="dep-version-divergence",
                        )
                    )

    # In full mode, run lightweight security audit
    if not quick:
        try:
            res = subprocess.run(
                ["pnpm", "audit", "--audit-level=high", "--json"],
                cwd=repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=15,
            )
            if res.stdout:
                try:
                    audit_data = json.loads(res.stdout)
                    vulns = audit_data.get("metadata", {}).get("vulnerabilities", {})
                    critical = vulns.get("critical", 0)
                    high = vulns.get("high", 0)
                    if critical > 0 or high > 0:
                        findings.append(
                            Finding(
                                module="dependencies",
                                severity=Severity.HIGH if critical == 0 else Severity.CRITICAL,
                                title="Vulnerable Dependencies Detected",
                                message=f"pnpm audit detected {critical} critical and {high} high vulnerabilities.",
                                suggestion="Run: pnpm audit --fix",
                                rule_id="dep-security-audit",
                            )
                        )
                except Exception:
                    pass
        except Exception:
            pass  # pnpm audit optional / timed out

    return ModuleResult(
        module="dependencies",
        passed=sum(1 for f in findings if f.severity == Severity.CRITICAL) == 0,
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
