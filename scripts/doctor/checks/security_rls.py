from __future__ import annotations

import os
import re
import subprocess
import time
from pathlib import Path

from ..core.models import Finding, ModuleResult, Severity

# Preserve schema qualification so private schema names are not misclassified
# as public table names. The translation_private schema is deliberately not exposed
# through PostgREST and its tables explicitly revoke all client privileges.
CREATE_TABLE_RE = re.compile(
    r"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?P<schema>[a-zA-Z0-9_]+)\.)?(?P<table>[a-zA-Z0-9_]+)",
    re.IGNORECASE,
)
ENABLE_RLS_RE = re.compile(
    r"\bALTER\s+TABLE\s+(?:ONLY\s+)?(?:(?P<schema>[a-zA-Z0-9_]+)\.)?(?P<table>[a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\b",
    re.IGNORECASE,
)
SEC_DEFINER_RE = re.compile(
    r"\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)[^;]+?SECURITY\s+DEFINER",
    re.IGNORECASE | re.DOTALL,
)
SEARCH_PATH_RE = re.compile(
    r"\bSET\s+search_path\s*(?:=|TO)\s*(?:''|'')\s*(?=\s*(?:AS\b|LANGUAGE\b|STABLE\b|IMMUTABLE\b|VOLATILE\b|PARALLEL\b|COST\b|ROWS\b|SECURITY\b|LEAKPROOF\b|SET\b|;|$))|"
    r"\bSET\s+search_path\s*(?:=|TO)\s*(?:pg_catalog(?:\s*,\s*public)?|public(?:\s*,\s*(?:extensions\s*,\s*)?pg_temp)?|pg_temp)\s*(?=\s*(?:AS\b|LANGUAGE\b|STABLE\b|IMMUTABLE\b|VOLATILE\b|PARALLEL\b|COST\b|ROWS\b|SECURITY\b|LEAKPROOF\b|SET\b|;|$))",
    re.IGNORECASE,
)


def _executable_sql(content: str) -> str:
    """Blank line and nested block comments without changing SQL offsets."""
    output: list[str] = []
    i = 0
    while i < len(content):
        if content[i] in ("'", '"'):
            quote = content[i]
            start = i
            i += 1
            while i < len(content):
                if content[i] == quote:
                    i += 1
                    if i < len(content) and content[i] == quote:
                        i += 1
                    else:
                        break
                else:
                    i += 1
            output.append(content[start:i])
        elif content.startswith("--", i):
            end = content.find("\n", i)
            if end < 0:
                end = len(content)
            output.append(" " * (end - i))
            i = end
        elif content.startswith("/*", i):
            start = i
            depth = 1
            i += 2
            while i < len(content) and depth:
                if content.startswith("/*", i):
                    depth += 1
                    i += 2
                elif content.startswith("*/", i):
                    depth -= 1
                    i += 2
                else:
                    i += 1
            output.append("".join("\n" if char == "\n" else " " for char in content[start:i]))
        else:
            output.append(content[i])
            i += 1
    return "".join(output)


def _private_table_revoked(table: str, sql: str) -> bool:
    """Require an effective explicit revoke for every client role in migration SQL."""
    permissions = {role: False for role in ("public", "anon", "authenticated")}
    pattern = re.compile(
        rf"\b(?P<verb>GRANT|REVOKE)\s+(?P<privileges>[^;]*?)\s+ON\s+TABLE\s+{re.escape(table)}\s+(?:TO|FROM)\s+(?P<roles>[^;]+);",
        re.IGNORECASE,
    )
    for match in pattern.finditer(sql):
        roles = {role.strip().lower() for role in match.group("roles").split(",")}
        for role in permissions.keys() & roles:
            if match.group("verb").upper() == "GRANT":
                permissions[role] = False
            elif match.group("privileges").strip().upper() == "ALL":
                permissions[role] = True
    return all(permissions.values())


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

    migration_files = sorted(migrations_dir.glob("*.sql"))
    if ci:
        base_branch = os.environ.get("GITHUB_BASE_REF", "main").strip() or "main"
        changed = subprocess.run(
            ["git", "diff", "--name-only", f"origin/{base_branch}...HEAD", "--", "supabase/migrations/"],
            cwd=repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if changed.returncode == 0:
            changed_paths = set(changed.stdout.splitlines())
            migration_files = [
                path for path in migration_files if str(path.relative_to(repo_root)) in changed_paths
            ]

    # Read all migrations for effective grant order, including later grants to
    # private tables created in an earlier migration.
    permission_sql = "\n".join(
        _executable_sql(path.read_text(encoding="utf-8"))
        for path in sorted(migrations_dir.glob("*.sql"))
    )

    for file_path in migration_files:
        try:
            content = _executable_sql(file_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        rel_path = str(file_path.relative_to(repo_root))

        # Check tables created vs RLS enabled
        created_tables = {(m.group("schema") or "public").lower() + "." + m.group("table").lower()
                          for m in CREATE_TABLE_RE.finditer(content)}
        enabled_rls_tables = {(m.group("schema") or "public").lower() + "." + m.group("table").lower()
                              for m in ENABLE_RLS_RE.finditer(content)}

        # translation_private is a non-exposed schema with no client table grants.
        # It uses SECURITY DEFINER predicates with fixed empty search_path and
        # explicitly REVOKEs client privileges in the creating migration.
        ignored_tables = {"public.spatial_ref_sys", "public.schema_migrations"}

        for tbl in created_tables:
            if tbl in ignored_tables:
                continue
            if tbl.startswith("translation_private.") and _private_table_revoked(tbl, permission_sql):
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
