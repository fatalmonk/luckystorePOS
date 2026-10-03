"""Guarded, rollback-only proof against the authorized disposable project.

Reads TEST_DATABASE_URL or SUPABASE_DB_URL from .env.local without displaying credentials.
Never uses the production-linked Supabase CLI configuration.
"""
from pathlib import Path
from urllib.parse import urlparse, unquote
import os
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REF = 'grxxenvdhfwzafzyykgo'
source = ROOT / '.env.local'
if not source.exists():
    sys.exit('BLOCKED: .env.local is unavailable')
match = re.search(r'^(?:TEST_DATABASE_URL|SUPABASE_DB_URL)=(.*)$', source.read_text(), re.M)
if not match:
    sys.exit('BLOCKED: TEST_DATABASE_URL/SUPABASE_DB_URL is unavailable')
target = urlparse(match.group(1).strip().strip('\"\''))
if not (target.hostname == f'db.{REF}.supabase.co' or
        (unquote(target.username or '') == f'postgres.{REF}' and
         (target.hostname or '').endswith('.pooler.supabase.com'))):
    sys.exit('BLOCKED: database URL is not the authorized disposable target')
environment = os.environ.copy()
environment.update(PGPASSWORD=unquote(target.password or ''), PGSSLMODE='require',
                   PGCONNECT_TIMEOUT='10', PGAPPNAME=f'codex-disposable-{REF}')
command = ['psql', '-X', '-h', target.hostname, '-p', str(target.port or 5432),
           '-U', unquote(target.username or ''), '-d', target.path.lstrip('/'),
           '-v', 'ON_ERROR_STOP=1']
guard = """
do $$ begin
  if not (session_user = 'postgres.grxxenvdhfwzafzyykgo' or
    (session_user = 'postgres' and current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo'))
  then raise exception 'DISPOSABLE_PROJECT_REQUIRED'; end if;
end $$;
"""
sql = f"begin;\nset local application_name = 'codex-disposable-{REF}';\n" + guard
sql += """
create temporary table image_backfill_fixture(id uuid, original_url text);
with tenant as (insert into public.tenants(name) values('Canva rollback backfill') returning id),
items as (insert into public.items(tenant_id,name,image_url)
  select id,'backfill known','https://images.luckystore1947.com/products/'||id||'/fixture.webp' from tenant
  union all select id,'backfill external','https://legacy.example/product.jpg' from tenant
  union all select id,'backfill ambiguous','https://images.luckystore1947.com/products/../fixture.webp' from tenant
  union all select id,'backfill empty',null from tenant returning id,image_url)
insert into image_backfill_fixture select id,image_url from items;
"""
for filename in ['20261003010000_add_product_image_metadata.sql',
                 '20261003020000_harden_product_image_cas.sql',
                 '20261003030000_canva_connect_phase1.sql']:
    sql += (ROOT / 'supabase/migrations' / filename).read_text() + '\n'
sql += """
do $$ begin
  if exists (select 1 from image_backfill_fixture f join public.items i using(id)
    where i.image_url is distinct from f.original_url or i.image_checksum is not null
      or i.image_version <> case when f.original_url is null then 0 else 1 end
      or (f.original_url like 'https://legacy.example/%' and i.image_key is not null)
      or (f.original_url like '%/../%' and i.image_key is not null)
      or (f.original_url like 'https://images.luckystore1947.com/%' and f.original_url not like '%/../%'
        and i.image_key is distinct from split_part(f.original_url, 'https://images.luckystore1947.com/', 2)))
  then raise exception 'BACKFILL_FAILED'; end if;
  raise notice '[PASS] migration preserves known/external/null URLs and safely initializes metadata';
end $$;
"""
for filename in ['product_image_metadata_test.sql', 'canva_connect_phase1_test.sql']:
    content = (ROOT / 'supabase/tests' / filename).read_text()
    # These proofs can also run standalone; use a single outer transaction here.
    content = re.sub(r'^\s*(begin|rollback);\s*$', '', content, flags=re.M | re.I)
    sql += content + '\n'
sql += 'rollback;\n'
result = subprocess.run(command, input=sql, text=True, capture_output=True, env=environment)
for line in (result.stdout + result.stderr).splitlines():
    if any(word in line for word in ['[PASS]', 'ERROR:', 'CONTEXT:', 'ROLLBACK', 'FAIL']):
        print(line)
print(f'Guarded SQL proof exit: {result.returncode}; transaction is rollback-only')
sys.exit(result.returncode)
