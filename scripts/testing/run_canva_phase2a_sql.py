"""Disposable-only rollback proof for Phase 2A; never uses the production-linked CLI."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'scripts/testing/run_canva_phase1_sql.py'
config={'__file__':str(p)}
exec(p.read_text().split('sql = f')[0],config)
command=config['command']
import shutil
if not shutil.which(command[0]):command[0]='/opt/homebrew/opt/postgresql@17/bin/psql'
check=subprocess.run(command+['-At','-c',"select to_regclass('public.canva_design_runs') is not null;"],env=config['environment'],capture_output=True,text=True)
if check.returncode:raise SystemExit('DISPOSABLE_SCHEMA_CHECK_FAILED')
source=(ROOT/'supabase/migrations/20261003040000_canva_phase2a_workflow.sql').read_text()
if check.stdout.strip()=='t':
 # Existing tables do not prove the transition function matches this migration.
 # Reinstall its function and grants in the rollback transaction before testing.
 marker='create function public.canva_run_transition'
 start=source.lower().index(marker)
 migration=source[start:].replace(marker,'create or replace function public.canva_run_transition',1)
else:
 migration=source
proof=(ROOT/'supabase/tests/canva_phase2a_workflow_test.sql').read_text()
sql="BEGIN; SET LOCAL application_name='codex-disposable-grxxenvdhfwzafzyykgo';"+config['guard']+migration+proof+'ROLLBACK;'
r=subprocess.run(command,input=sql,env=config['environment'],capture_output=True,text=True)
if r.returncode:
 print(r.stderr[-2000:]);raise SystemExit(r.returncode)
print('Phase 2A SQL authorization/idempotency/lease/RLS proof passed and rolled back.')
