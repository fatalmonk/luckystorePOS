"""Run the purchase RPC regression proof inside a disposable-only rollback."""
from pathlib import Path
from urllib.parse import unquote, urlparse
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REF = "grxxenvdhfwzafzyykgo"
source = Path(os.environ.get("LUCKY_STORE_ENV_FILE", ROOT / ".env.local"))
if not source.exists():
    sys.exit("BLOCKED: .env.local is unavailable")
match = re.search(r"^(?:TEST_DATABASE_URL|SUPABASE_DB_URL)=(.*)$", source.read_text(), re.M)
if not match:
    sys.exit("BLOCKED: TEST_DATABASE_URL/SUPABASE_DB_URL is unavailable")
target = urlparse(match.group(1).strip().strip("\"'"))
if not (
    target.hostname == f"db.{REF}.supabase.co"
    or (
        unquote(target.username or "") == f"postgres.{REF}"
        and (target.hostname or "").endswith(".pooler.supabase.com")
    )
):
    sys.exit("BLOCKED: database URL is not the authorized disposable target")

environment = os.environ.copy()
environment.update(
    PGPASSWORD=unquote(target.password or ""),
    PGSSLMODE="require",
    PGCONNECT_TIMEOUT="10",
    PGAPPNAME=f"codex-disposable-{REF}",
)
psql = shutil.which("psql") or "/opt/homebrew/opt/postgresql@17/bin/psql"
command = [
    psql, "-X", "-h", target.hostname, "-p", str(target.port or 5432),
    "-U", unquote(target.username or ""), "-d", target.path.lstrip("/"),
    "-v", "ON_ERROR_STOP=1",
]

guard = f"""
DO $$ BEGIN
  IF NOT (session_user = 'postgres.{REF}' OR
    (session_user = 'postgres' AND current_setting('application_name') = 'codex-disposable-{REF}'))
  THEN RAISE EXCEPTION 'DISPOSABLE_PROJECT_REQUIRED'; END IF;
END $$;
"""
production_snapshot = (ROOT / "supabase/migrations/20261003060559_repair_record_purchase_v2_store_scoped_stock_and_cost.sql").read_text()
forward_repair = (ROOT / "supabase/migrations/20261003134316_restrict_record_purchase_v2_to_admin_manager_and_persist_draft_items.sql").read_text()
precision_repair = (ROOT / "supabase/migrations/20261003160749_reconcile_purchase_rpc_ledger_precision.sql").read_text()
proof = (ROOT / "supabase/tests/purchase_v2_live_ledger_test.sql").read_text()
proof = re.sub(r"^\s*BEGIN;\s*", "", proof, count=1, flags=re.M | re.I)
proof = re.sub(r"\s*ROLLBACK;\s*$", "", proof, count=1, flags=re.M | re.I)
sql = f"BEGIN;\nSET LOCAL application_name = 'codex-disposable-{REF}';\n{guard}{production_snapshot}\n{forward_repair}\n{precision_repair}\n{proof}\nROLLBACK;\n"

result = subprocess.run(command, input=sql, text=True, capture_output=True, env=environment)
for line in (result.stdout + result.stderr).splitlines():
    if any(marker in line for marker in ("[PASS]", "[FAIL]", "ERROR:", "ROLLBACK", "DISPOSABLE_PROJECT")):
        print(line)
print(f"Guarded purchase proof exit: {result.returncode}; transaction is rollback-only")
sys.exit(result.returncode)
