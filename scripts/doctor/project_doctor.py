#!/usr/bin/env python3
"""
RetailOS / Lucky Store Project Doctor (v1)
Unified health, security, and maintenance automation layer.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Setup module import root
repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

from scripts.doctor.checks import (
    dependencies,
    migrations,
    repo_hygiene,
    secrets,
    security_rls,
    test_gaps,
)
from scripts.doctor.core.baselines import BaselineManager
from scripts.doctor.core.models import Finding, ModuleResult, Severity

MODULES = {
    "secrets": secrets.run,
    "repo_hygiene": repo_hygiene.run,
    "migrations": migrations.run,
    "security_rls": security_rls.run,
    "dependencies": dependencies.run,
    "test_gaps": test_gaps.run,
}

# ANSI colors
RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
GRAY = "\033[90m"


def format_severity(sev: Severity) -> str:
    if sev == Severity.CRITICAL:
        return f"{RED}{BOLD}[CRITICAL]{RESET}"
    if sev == Severity.HIGH:
        return f"{RED}[HIGH]{RESET}"
    if sev == Severity.MEDIUM:
        return f"{YELLOW}[MEDIUM]{RESET}"
    return f"{GRAY}[{sev.value}]{RESET}"


def generate_markdown(results: list[ModuleResult], elapsed_ms: float) -> str:
    total_crit = sum(r.critical_count for r in results)
    total_high = sum(r.high_count for r in results)
    total_warn = sum(r.warning_count for r in results)
    status_icon = "❌ Failed" if (total_crit > 0 or total_high > 0) else "✅ Passed"

    lines = [
        f"## 🩺 Project Doctor Health Report — {status_icon}",
        f"**Duration**: {elapsed_ms:.1f}ms | **Critical**: {total_crit} | **High**: {total_high} | **Warnings**: {total_warn}",
        "",
        "| Module | Status | Findings | Duration |",
        "|---|---|---|---|",
    ]

    for r in results:
        status = "✅ Pass" if r.passed else "❌ Fail"
        findings_count = len(r.findings)
        lines.append(f"| `{r.module}` | {status} | {findings_count} | {r.duration_ms:.1f}ms |")

    # List non-zero findings
    all_findings = [f for r in results for f in r.findings]
    if all_findings:
        lines.append("\n### Detailed Findings\n")
        for f in all_findings:
            loc = f" (`{f.file_path}:{f.line}`)" if f.file_path and f.line else (f" (`{f.file_path}`)" if f.file_path else "")
            lines.append(f"- **[{f.severity.value}] {f.title}**{loc}: {f.message}")
            if f.suggestion:
                lines.append(f"  - *Suggestion*: {f.suggestion}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="RetailOS Project Doctor v1")
    parser.add_argument("--quick", action="store_true", help="Fast check on staged/local changes only")
    parser.add_argument("--ci", action="store_true", help="CI/PR mode (strict exit codes on new issues)")
    parser.add_argument("--full", action="store_true", help="Run full comprehensive monorepo audit")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    parser.add_argument("--markdown", action="store_true", help="Output PR markdown summary")
    parser.add_argument("--save-baseline", action="store_true", help="Snapshot current findings as baseline debt")
    parser.add_argument("--module", choices=list(MODULES.keys()), help="Run only a specific module")

    args = parser.parse_args()
    start_total = time.time()

    baseline_path = repo_root / ".doctor_baseline.json"
    baseline_mgr = BaselineManager(baseline_path)

    active_modules = [args.module] if args.module else list(MODULES.keys())
    results: list[ModuleResult] = []

    if not args.json and not args.markdown:
        mode_label = "CI" if args.ci else ("QUICK" if args.quick else "FULL")
        print(f"\n{BOLD}🩺 RetailOS Project Doctor v1{RESET} [{mode_label} mode]")
        print(f"{GRAY}Scanning repository: {repo_root}{RESET}\n")

    for mod_name in active_modules:
        runner_fn = MODULES[mod_name]
        try:
            res: ModuleResult = runner_fn(repo_root, quick=args.quick, ci=args.ci)
            # Filter findings against baseline if not saving baseline
            if not args.save_baseline:
                active_findings = [f for f in res.findings if not baseline_mgr.is_suppressed(f)]
                res.findings = active_findings
                res.passed = sum(1 for f in active_findings if f.severity in (Severity.CRITICAL, Severity.HIGH)) == 0
            results.append(res)
        except Exception as e:
            results.append(
                ModuleResult(
                    module=mod_name,
                    passed=False,
                    findings=[
                        Finding(
                            module=mod_name,
                            severity=Severity.HIGH,
                            title="Module Execution Error",
                            message=str(e),
                        )
                    ],
                )
            )

    elapsed_ms = (time.time() - start_total) * 1000

    # Save baseline if requested
    if args.save_baseline:
        all_findings = [f for r in results for f in r.findings]
        baseline_mgr.save(all_findings)
        print(f"✅ Baseline saved with {len(all_findings)} suppressed findings to {baseline_path.name}")
        sys.exit(0)

    # Output JSON
    if args.json:
        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": round(elapsed_ms, 2),
            "passed": all(r.passed for r in results),
            "modules": [r.to_dict() for r in results],
        }
        print(json.dumps(payload, indent=2))
        sys.exit(0 if payload["passed"] else 1)

    # Output Markdown
    if args.markdown:
        print(generate_markdown(results, elapsed_ms))
        sys.exit(0 if all(r.passed for r in results) else 1)

    # Console display
    for r in results:
        status_badge = f"{GREEN}PASS{RESET}" if r.passed else f"{RED}FAIL{RESET}"
        finding_info = f"({len(r.findings)} findings)" if r.findings else "(clean)"
        print(f"[{status_badge}] {BOLD}{r.module:<15}{RESET} {finding_info:<16} {GRAY}{r.duration_ms:>6.1f}ms{RESET}")

        for f in r.findings:
            sev_badge = format_severity(f.severity)
            loc = f" {CYAN}{f.file_path}{RESET}" if f.file_path else ""
            line_str = f":{f.line}" if f.line else ""
            print(f"       {sev_badge} {f.title}{loc}{line_str}")
            print(f"         {f.message}")
            if f.suggestion:
                print(f"         {GRAY}↳ Suggestion: {f.suggestion}{RESET}")

    total_critical = sum(r.critical_count for r in results)
    total_high = sum(r.high_count for r in results)

    print(f"\n{BOLD}Audit finished in {elapsed_ms:.1f}ms{RESET}")

    if total_critical > 0 or (args.ci and total_high > 0):
        print(f"{RED}{BOLD}Doctor failed: {total_critical} critical, {total_high} high severity issues detected.{RESET}\n")
        sys.exit(1)

    print(f"{GREEN}{BOLD}Doctor passed: All modules clean.{RESET}\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
