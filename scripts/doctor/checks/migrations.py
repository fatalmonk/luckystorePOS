from __future__ import annotations

import re
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity

DROP_TABLE_RE = re.compile(r"\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^\s;]+)", re.IGNORECASE)
DROP_COLUMN_RE = re.compile(r"\bALTER\s+TABLE\s+([^\s;]+)\s+DROP\s+COLUMN\s+([^\s;]+)", re.IGNORECASE)
TIMESTAMP_RE = re.compile(r"^(\d{14})_(.+)\.sql$")


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Audit Supabase migrations for timestamp order, duplicates, and destructive DDL."""
    start_time = time.time()
    findings: list[Finding] = []
    migrations_dir = repo_root / "supabase" / "migrations"

    if not migrations_dir.is_dir():
        return ModuleResult(
            module="migrations",
            passed=True,
            findings=[],
            duration_ms=(time.time() - start_time) * 1000,
        )

    migration_files = sorted(migrations_dir.glob("*.sql"), key=lambda p: p.name)
    seen_timestamps: dict[str, str] = {}
    last_timestamp = ""

    for file_path in migration_files:
        name = file_path.name
        rel_path = str(file_path.relative_to(repo_root))

        # Check timestamp format
        match = TIMESTAMP_RE.match(name)
        if not match:
            # Check for shorter timestamp (e.g. standard supabase timestamp format)
            findings.append(
                Finding(
                    module="migrations",
                    severity=Severity.LOW,
                    title="Non-standard Migration Filename",
                    message=f"Migration '{name}' does not match standard YYYYMMDDHHMMSS_*.sql format.",
                    file_path=rel_path,
                    rule_id="mig-filename-format",
                )
            )
            continue

        ts, slug = match.groups()

        # Check duplicate timestamps
        if ts in seen_timestamps:
            findings.append(
                Finding(
                    module="migrations",
                    severity=Severity.CRITICAL,
                    title="Duplicate Migration Timestamp",
                    message=f"Duplicate timestamp '{ts}' shared between '{name}' and '{seen_timestamps[ts]}'.",
                    file_path=rel_path,
                    suggestion="Re-stamp migration timestamp so it executes deterministically.",
                    rule_id="mig-duplicate-timestamp",
                )
            )
        seen_timestamps[ts] = name

        # Check chronology
        if last_timestamp and ts < last_timestamp:
            findings.append(
                Finding(
                    module="migrations",
                    severity=Severity.HIGH,
                    title="Out-of-Order Migration",
                    message=f"Migration '{name}' timestamp {ts} is older than previous {last_timestamp}.",
                    file_path=rel_path,
                    rule_id="mig-out-of-order",
                )
            )
        last_timestamp = ts

        # Content inspection for destructive DDL
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            continue

        # Flag DROP TABLE
        for drop_match in DROP_TABLE_RE.finditer(content):
            table_name = drop_match.group(1)
            findings.append(
                Finding(
                    module="migrations",
                    severity=Severity.HIGH,
                    title="Destructive DDL: DROP TABLE",
                    message=f"Migration '{name}' contains 'DROP TABLE {table_name}'.",
                    file_path=rel_path,
                    suggestion="Verify migration will not cause irreversible production data loss.",
                    rule_id="mig-destructive-drop-table",
                )
            )

        # Flag DROP COLUMN
        for col_match in DROP_COLUMN_RE.finditer(content):
            table_name, col_name = col_match.groups()
            findings.append(
                Finding(
                    module="migrations",
                    severity=Severity.HIGH,
                    title="Destructive DDL: DROP COLUMN",
                    message=f"Migration '{name}' drops column '{col_name}' from '{table_name}'.",
                    file_path=rel_path,
                    suggestion="Ensure multi-step deployment (stop writing -> deploy code -> drop column).",
                    rule_id="mig-destructive-drop-column",
                )
            )

    has_critical = any(f.severity == Severity.CRITICAL for f in findings)
    return ModuleResult(
        module="migrations",
        passed=not has_critical,
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
