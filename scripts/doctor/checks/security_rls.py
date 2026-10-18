from __future__ import annotations

import re
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity

CREATE_TABLE_RE = re.compile(
    r"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)",
    re.IGNORECASE,
)
ENABLE_RLS_RE = re.compile(
    r"\bALTER\s+TABLE\s+(?:(?:ONLY|public)\s+)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\b",
    re.IGNORECASE,
)
SEC_DEFINER_RE = re.compile(
    r"\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)[^;]+?SECURITY\s+DEFINER",
    re.IGNORECASE | re.DOTALL,
)
SEARCH_PATH_RE = re.compile(r"\bSET\s+search_path\s*=\s*(?:''|public|pg_temp)", re.IGNORECASE)


def run(repo_root: Path, quick: bool = False, ci: bool = False) -> ModuleResult:
    """Audit PostgreSQL security: missing RLS on created tables and insecure SECURITY DEFINER."""
    start_time = time.time()
    findings: list[Finding] = []
    migrations_dir = repo_root / "supabase" / "migrations"

    if not migrations_dir.is_dir():
        return ModuleResult(
            module="security_rls",
            passed=True,
            findings=[],
            duration_ms=(time.time() - start_time) * 1000,
        )

    # In quick/ci mode, focus on recently added or modified migrations if available
    migration_files = sorted(migrations_dir.glob("*.sql"))

    for file_path in migration_files:
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            continue

        rel_path = str(file_path.relative_to(repo_root))

        # Check tables created vs RLS enabled
        created_tables = set(CREATE_TABLE_RE.findall(content))
        enabled_rls_tables = set(ENABLE_RLS_RE.findall(content))

        # Disregard internal or temp tables
        ignored_tables = {"spatial_ref_sys", "schema_migrations"}

        for tbl in created_tables:
            if tbl.lower() in ignored_tables:
                continue
            if tbl not in enabled_rls_tables:
                findings.append(
                    Finding(
                        module="security_rls",
                        severity=Severity.CRITICAL,
                        title="Table Created Without RLS",
                        message=f"Table '{tbl}' is created in '{file_path.name}' but missing 'ENABLE ROW LEVEL SECURITY'.",
                        file_path=rel_path,
                        suggestion=f"Add: ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;",
                        rule_id="sec-rls-missing",
                    )
                )

        # Check SECURITY DEFINER without explicit search_path
        # Split functions roughly by $$ or function blocks
        func_blocks = re.split(r"(?i)\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b", content)
        for block in func_blocks[1:]:
            if "SECURITY DEFINER" in block.upper():
                func_name_match = re.match(r"\s*([a-zA-Z0-9_.]+)", block)
                func_name = func_name_match.group(1) if func_name_match else "unknown_function"
                if not SEARCH_PATH_RE.search(block):
                    findings.append(
                        Finding(
                            module="security_rls",
                            severity=Severity.HIGH,
                            title="SECURITY DEFINER Missing search_path",
                            message=f"Function '{func_name}' is SECURITY DEFINER but omits 'SET search_path = '''.",
                            file_path=rel_path,
                            suggestion="Add 'SET search_path = ''' to prevent search path hijacking.",
                            rule_id="sec-definer-search-path",
                        )
                    )

    has_critical = any(f.severity == Severity.CRITICAL for f in findings)
    return ModuleResult(
        module="security_rls",
        passed=not has_critical,
        findings=findings,
        duration_ms=(time.time() - start_time) * 1000,
    )
