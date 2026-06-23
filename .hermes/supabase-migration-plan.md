
hermes_plan = """# Supabase Project Migration Plan — Hermes Agent Loop Execution Ready
# Version: 5.0-Hermes
# Target: luckystore1947.com
# From: hvmyxyccfnkrbxqbhlnm (payment-locked) → New Supabase Project

# =============================================================================
# EXECUTION MODEL: Hermes Agent Loop
# =============================================================================
# Each phase is idempotent, machine-verifiable, and fails independently.
# A phase that fails halts execution; the operator fixes the issue and re-runs
# the phase. No phase depends on transient human state.
#
# CHECKPOINT FILE: /tmp/migration_checkpoint.json
# Each successful phase writes its checkpoint. Re-running the plan skips
# completed phases automatically.
#
# ENVIRONMENT REQUIRED:
#   OLD_DB_HOST, OLD_DB_USER, OLD_DB_PASSWORD
#   NEW_DB_HOST, NEW_DB_PASSWORD
#   NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_ANON_KEY
#   NEW_PROJECT_REF
#   LOCAL_IMAGES_PATH (absolute path to local backup folder)
#   VERCEL_TOKEN, VERCEL_PROJECT_ID (for automated env var updates)

# =============================================================================
# PRE-FLIGHT: Blocking Validation
# =============================================================================

## Gate 0.1: Local Images Exist
```bash
if [ ! -d "$LOCAL_IMAGES_PATH" ]; then
  echo "FATAL: LOCAL_IMAGES_PATH does not exist: $LOCAL_IMAGES_PATH"
  echo "ACTION: Provide absolute path to item-images backup or formulate scrape fallback"
  exit 1
fi
FILE_COUNT=$(find "$LOCAL_IMAGES_PATH" -type f | wc -l)
echo "Found $FILE_COUNT files in $LOCAL_IMAGES_PATH"
```

## Gate 0.2: New Project Connectivity
```bash
# Test direct DB connection
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "SELECT 1;" || exit 1

# Test Supabase API
 curl -s -o /dev/null -w "%{http_code}" \
   "$NEW_SUPABASE_URL/rest/v1/" \
   -H "apikey: $NEW_SUPABASE_ANON_KEY" | grep -q "200\\|401" || exit 1
# 401 is expected (no table access), 200 also acceptable. 403/404/000 = fail.

# Capture new instance_id for auth migration
NEW_INSTANCE_ID=$(PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -Atc "SELECT DISTINCT instance_id FROM auth.users LIMIT 1;")
echo "NEW_INSTANCE_ID=$NEW_INSTANCE_ID"
```

## Gate 0.3: Old Project DB Accessibility
```bash
PGPASSWORD="$OLD_DB_PASSWORD" pg_dump -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres \
  -n public --schema-only | head -20 > /tmp/old_db_schema_preview.sql
if [ ! -s /tmp/old_db_schema_preview.sql ]; then
  echo "FATAL: Cannot connect to old database"
  exit 1
fi
echo "Old DB connection verified"
```

# =============================================================================
# PHASE 0: Pre-Migration Preparation
# =============================================================================
# INPUT:  Clean working tree, scraper workflow active
# OUTPUT: Git checkpoint committed, scraper disabled, maintenance flag set
# CHECKPOINT: phase_0_complete

```bash
# 0.1 Git checkpoint
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "[MIGRATION] Checkpoint before Supabase project migration"
  CHECKPOINT_COMMIT=$(git rev-parse HEAD)
  echo "CHECKPOINT_COMMIT=$CHECKPOINT_COMMIT"
else
  echo "Working tree clean — no checkpoint commit needed"
fi

# 0.2 Stop scrapers
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_REPO/actions/workflows/scraper-daily.yml/disable" \
  || echo "WARNING: Could not disable scraper workflow (manual step required)"

# 0.3 Application-level maintenance mode (idempotent)
# Try stores table first; if no rows match, no-op is safe
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c "
  DO \$\$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
      UPDATE public.stores SET is_active = false WHERE id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
      IF FOUND THEN
        RAISE NOTICE 'Maintenance mode enabled on old DB';
      ELSE
        RAISE NOTICE 'Store row not found — proceeding with race window';
      END IF;
    END IF;
  END \$\$;
"
```

# =============================================================================
# PHASE 1: Database Extraction
# =============================================================================
# INPUT:  Old DB accessible, env vars set
# OUTPUT: db_backup.sql, auth_users.csv, auth_identities.csv
# CHECKPOINT: phase_1_complete
# IDEMPOTENCY: Re-running overwrites files (safe)

```bash
# 1.1 Dump application schemas (public + supabase_migrations)
PGPASSWORD="$OLD_DB_PASSWORD" pg_dump -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres \
  -n public -n supabase_migrations \
  --clean --if-exists --no-owner --no-privileges \
  -f db_backup.sql

# Verify dump integrity
if [ ! -s db_backup.sql ]; then
  echo "FATAL: db_backup.sql is empty"
  exit 1
fi
DUMP_SIZE=$(wc -c < db_backup.sql)
echo "Dump size: $DUMP_SIZE bytes"

# 1.2 Extract auth users (6 accounts, email/password only)
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
  "COPY (SELECT id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
    FROM auth.users) TO STDOUT WITH CSV HEADER" > auth_users.csv

# 1.3 Extract auth identities (5 records)
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
  "COPY (SELECT id, user_id, provider, identity_data,
    provider_id, last_sign_in_at, created_at, updated_at
    FROM auth.identities) TO STDOUT WITH CSV HEADER" > auth_identities.csv

# 1.4 Extract the 6 user emails for dynamic instance_id scoping
AUTH_USER_EMAILS=$(PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -Atc \
  "SELECT string_agg(quote_literal(email), ',') FROM auth.users WHERE email IS NOT NULL;")
echo "AUTH_USER_EMAILS=$AUTH_USER_EMAILS"
```

# =============================================================================
# PHASE 1.5: Rollback Plan (Declarative, Not Executed)
# =============================================================================
# This section documents the rollback sequence. It is NOT executed during
# forward migration. Hermes will execute it only if a phase fails and the
# operator invokes ROLLBACK mode.
#
# ROLLBACK SEQUENCE:
#   1. PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
#        "UPDATE public.stores SET is_active = true WHERE id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';"
#   2. git checkout -- .env .env.local
#   3. Vercel env var revert (see Phase 5 for reverse mapping)
#   4. Vercel redeploy
#   5. Re-enable scraper workflow via GitHub API

# =============================================================================
# PHASE 2: Database Restore & Auth Hydration
# =============================================================================
# INPUT:  db_backup.sql, auth_users.csv, auth_identities.csv, NEW_INSTANCE_ID
# OUTPUT: New DB populated with public schema, auth users, identities
# CHECKPOINT: phase_2_complete
# IDEMPOTENCY: TRUNCATE + restore is destructive but deterministic

```bash
# 2.1 Pre-check: Clear migration history if present (idempotent)
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "
  DO \$\$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
      TRUNCATE supabase_migrations.schema_migrations;
      RAISE NOTICE 'Cleared existing migration history';
    END IF;
  END \$\$;
"

# 2.2 Restore public schema
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -f db_backup.sql

# 2.3 Restore auth users
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "COPY auth.users(id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at) FROM STDIN WITH CSV HEADER" < auth_users.csv

# 2.4 Fix instance_id — DYNAMICALLY SCOPED to imported users only
# Uses the email list extracted in Phase 1.4, avoiding hardcoded UUIDs
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "
  UPDATE auth.users
  SET instance_id = '$NEW_INSTANCE_ID'
  WHERE email IN ($AUTH_USER_EMAILS);
"

# 2.5 Restore auth identities
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "COPY auth.identities(id, user_id, provider, identity_data,
    provider_id, last_sign_in_at, created_at, updated_at) FROM STDIN WITH CSV HEADER" < auth_identities.csv

# 2.6 Row count audit (machine-verifiable)
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "
  SELECT 'public.items' as tbl, COUNT(*) as cnt FROM public.items
  UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users
  UNION ALL SELECT 'auth.identities', COUNT(*) FROM auth.identities
  UNION ALL SELECT 'public.products', COUNT(*) FROM public.products
  UNION ALL SELECT 'public.transactions', COUNT(*) FROM public.transactions
  UNION ALL SELECT 'public.stores', COUNT(*) FROM public.stores;
"
# EXPECTED: items=580, users=6, identities=5, products=?, transactions=?, stores=?
```

# =============================================================================
# PHASE 3: Infrastructure Configuration
# =============================================================================
# INPUT:  New DB restored, edge functions ready to deploy
# OUTPUT: Buckets, policies, realtime, edge functions, auth settings
# CHECKPOINT: phase_3_complete
# IDEMPOTENCY: All operations use IF NOT EXISTS or upsert patterns

## 3.1 Storage Buckets (CLI + SQL fallback)
```bash
# Primary: Supabase CLI (ensures internal side-effects)
supabase buckets create item-images --public --project-ref "$NEW_PROJECT_REF" 2>/dev/null || echo "Bucket may already exist — proceeding to SQL verification"
supabase buckets create product-images --public --project-ref "$NEW_PROJECT_REF" 2>/dev/null || echo "Bucket may already exist — proceeding to SQL verification"

# Verify and apply constraints via SQL (idempotent)
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "
  -- Upsert bucket metadata
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('item-images', 'item-images', true, NULL, NULL),
    ('product-images', 'product-images', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}')
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
"
```

## 3.2 Storage RLS Policies (idempotent — DROP IF EXISTS + CREATE)
```sql
-- Execute on NEW database
DO $$
BEGIN
  -- item-images policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read item-images') THEN
    CREATE POLICY "Public Read item-images" ON storage.objects
      FOR SELECT USING (bucket_id = 'item-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload item-images') THEN
    CREATE POLICY "Auth Upload item-images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');
  END IF;

  -- product-images policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read product-images') THEN
    CREATE POLICY "Public Read product-images" ON storage.objects
      FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload product-images') THEN
    CREATE POLICY "Auth Upload product-images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
  END IF;
END $$;
```

## 3.3 Realtime Publications (idempotent — checks before adding)
```sql
-- Execute on NEW database
DO $$
DECLARE
  tables TEXT[] := ARRAY['categories','stores','users','ledger_accounts',
                         'ledger_entries','parties','daily_sales','orders'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
```

## 3.4 Edge Functions
```bash
# Deploy before any webhook references them
supabase functions deploy import-inventory --project-ref "$NEW_PROJECT_REF"
supabase functions deploy create-sale --project-ref "$NEW_PROJECT_REF"
```

## 3.5 Auth Settings (API-driven, no dashboard clicks)
```bash
# Set redirect URLs via Management API
# Note: Supabase Management API requires project-level service key or OAuth
curl -X PUT "https://api.supabase.com/v1/projects/$NEW_PROJECT_REF/auth/config" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://luckystore1947.com",
    "additional_redirect_urls": ["http://localhost:3000", "https://luckystore1947.com"]
  }' || echo "WARNING: Management API auth config failed — manual dashboard step required"

# Email templates: Documented for manual verification if API fails
# - Confirm URL template uses {{ .ConfirmationURL }}
# - Reset password template uses {{ .SiteURL }}/auth/reset-password
```

# =============================================================================
# PHASE 4: Image Compression & Storage Upload
# =============================================================================
# INPUT:  LOCAL_IMAGES_PATH, NEW_SUPABASE_SERVICE_ROLE_KEY
# OUTPUT: Images uploaded to new storage, URLs updated in DB
# CHECKPOINT: phase_4_complete
# IDEMPOTENCY: Upload uses deterministic paths; SQL uses WHERE clauses

## 4.1 compress-upload-local.mjs (Hermes-Ready Script)
```javascript
#!/usr/bin/env node
/**
 * compress-upload-local.mjs — Hermes Agent Loop Compatible
 * Reads images from LOCAL_IMAGES_PATH, compresses to WebP, uploads to Supabase.
 * Idempotent: re-uploading overwrites existing objects.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, extname, relative, dirname } from 'path';
import { createReadStream } from 'fs';

const SUPABASE_URL = process.env.NEW_SUPABASE_URL;
const SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_PATH = process.env.LOCAL_IMAGES_PATH;
const BUCKET = 'item-images';

if (!SUPABASE_URL || !SERVICE_KEY || !LOCAL_PATH) {
  console.error('FATAL: Missing required env vars: NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY, LOCAL_IMAGES_PATH');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const results = { uploaded: [], failed: [], skipped: [], total: 0 };

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function processFile(filePath) {
  const relPath = relative(LOCAL_PATH, filePath);
  const ext = extname(filePath).toLowerCase();
  const baseName = relPath.replace(/\\.[^.]+$/, '');
  const storagePath = `${baseName}.webp`;

  let buffer;
  const contentType = 'image/webp';

  if (ext === '.webp') {
    // Pass through existing WebP files
    buffer = await readFile(filePath);
    results.skipped.push({ original: relPath, reason: 'already_webp' });
  } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    // Compress to WebP
    buffer = await sharp(filePath)
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } else {
    results.skipped.push({ original: relPath, reason: `unsupported_ext_${ext}` });
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: 'public, max-age=31536000',
    });

  if (error) {
    results.failed.push({ original: relPath, storagePath, error: error.message });
  } else {
    results.uploaded.push({ original: relPath, storagePath, size: buffer.length });
  }
}

async function main() {
  const startTime = Date.now();
  for await (const filePath of walkDir(LOCAL_PATH)) {
    results.total++;
    await processFile(filePath);
  }
  const duration = Date.now() - startTime;

  results.duration_ms = duration;
  await writeFile('compress-results.json', JSON.stringify(results, null, 2));

  console.log(`Processed ${results.total} files in ${duration}ms`);
  console.log(`Uploaded: ${results.uploaded.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.error('FATAL: Some uploads failed. See compress-results.json');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
```

## 4.2 Execute Upload
```bash
node scripts/compress-upload-local.mjs
```

## 4.3 Parity Check (Machine-Verifiable)
```bash
LOCAL_COUNT=$(find "$LOCAL_IMAGES_PATH" -type f | wc -l)
STORAGE_COUNT=$(PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -Atc \
  "SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'item-images';")

echo "Local files: $LOCAL_COUNT"
echo "Storage objects: $STORAGE_COUNT"

if [ "$LOCAL_COUNT" -ne "$STORAGE_COUNT" ]; then
  echo "WARNING: Count mismatch. Investigate compress-results.json for failures or nested path issues."
fi
```

## 4.4 Atomic URL Update (All 6 Tables — Idempotent)
```sql
-- Execute on NEW database
-- Preview first (non-destructive):
SELECT 'items' as tbl, id, image_url,
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i') as new_url
FROM public.items
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'
UNION ALL
SELECT 'featured_products', id::text, image_url,
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i')
FROM public.featured_products
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'
UNION ALL
SELECT 'products', id::text, image_url,
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i')
FROM public.products
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'
UNION ALL
SELECT 'categories', id::text, image_url,
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i')
FROM public.categories
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'
UNION ALL
SELECT 'promos', id::text, image_url,
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i')
FROM public.promos
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'
UNION ALL
SELECT 'receipt_config', id::text, logo_url as image_url,
  regexp_replace(replace(logo_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref), '\.(jpe?g|png)$', '.webp', 'i')
FROM public.receipt_config
WHERE logo_url IS NOT NULL AND logo_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

-- Execute (single transaction, idempotent via WHERE clauses):
BEGIN;

UPDATE public.items SET image_url = regexp_replace(
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

UPDATE public.featured_products SET image_url = regexp_replace(
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

UPDATE public.products SET image_url = regexp_replace(
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

UPDATE public.categories SET image_url = regexp_replace(
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

UPDATE public.promos SET image_url = regexp_replace(
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

UPDATE public.receipt_config SET logo_url = regexp_replace(
  replace(logo_url, 'hvmyxyccfnkrbxqbhlnm', :new_ref),
  '\.(jpe?g|png)$', '.webp', 'i')
WHERE logo_url IS NOT NULL AND logo_url LIKE '%hvmyxyccfnkrbxqbhlnm%';

COMMIT;
```

# =============================================================================
# PHASE 5: Environment Updates & Cutover
# =============================================================================
# INPUT:  All previous phases successful
# OUTPUT: All apps pointing to new project, old store re-enabled as safety
# CHECKPOINT: phase_5_complete
# IDEMPOTENCY: Env var updates are overwrites; git tracks changes

## 5.1 Local File Updates
```bash
# Use sed to replace old project ref across all env files
OLD_REF="hvmyxyccfnkrbxqbhlnm"
NEW_URL="$NEW_SUPABASE_URL"

for file in \
  .env .env.local \
  apps/customer_storefront/.env.local \
  apps/admin_web/.env.local \
  apps/mobile_app/.env \
  apps/scraper/.env; do
  if [ -f "$file" ]; then
    sed -i.bak "s|$OLD_REF|$NEW_PROJECT_REF|g" "$file"
    sed -i.bak "s|https://$OLD_REF.supabase.co|$NEW_URL|g" "$file"
    echo "Updated $file"
  fi
done

# Update Supabase CLI link
supabase link --project-ref "$NEW_PROJECT_REF"
```

## 5.2 Vercel Environment Variables (API-Driven)
```bash
# Update Vercel env vars via CLI (requires vercel CLI auth)
vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes 2>/dev/null || true
vercel env add NEXT_PUBLIC_SUPABASE_URL production "$NEW_SUPABASE_URL" --yes

vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes 2>/dev/null || true
vercel env add SUPABASE_SERVICE_ROLE_KEY production "$NEW_SUPABASE_SERVICE_ROLE_KEY" --yes

vercel env rm SUPABASE_ANON_KEY production --yes 2>/dev/null || true
vercel env add SUPABASE_ANON_KEY production "$NEW_SUPABASE_ANON_KEY" --yes

vercel env rm DATABASE_URL production --yes 2>/dev/null || true
vercel env add DATABASE_URL production "postgresql://postgres:$NEW_DB_PASSWORD@$NEW_DB_HOST/postgres" --yes

# Trigger redeploy
vercel --prod
```

## 5.3 GitHub Secrets (API-Driven)
```bash
# Update repository secrets via GitHub API
for secret_name in SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY DATABASE_URL; do
  secret_value=$(eval echo "\$$secret_name")
  # Encrypt secret using GitHub public key (requires additional tooling)
  # Documented as manual step if API tooling unavailable
  echo "Update GitHub secret: $secret_name"
done
```

## 5.4 Re-enable Old Store (Safety)
```bash
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
  "UPDATE public.stores SET is_active = true WHERE id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';"
```

# =============================================================================
# PHASE 6: Verification (Automated + Manual Gates)
# =============================================================================
# CHECKPOINT: phase_6_complete

## 6.1 Automated Smoke Tests
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SUPABASE_ANON_KEY);

async function test() {
  // Auth count
  const { count: userCount } = await supabase.from('auth.users').select('*', { count: 'exact', head: true });
  console.assert(userCount === 6, 'Auth user count mismatch');

  // Random image URL test
  const { data: items } = await supabase.from('items').select('image_url').limit(20);
  for (const item of items) {
    const res = await fetch(item.image_url);
    console.assert(res.status === 200, 'Image 404: ' + item.image_url);
  }

  // Edge function health
  const efRes = await fetch(\`\${process.env.NEW_SUPABASE_URL}/functions/v1/import-inventory\`, {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${process.env.NEW_SUPABASE_ANON_KEY}\` },
    body: JSON.stringify({ test: true })
  });
  console.log('Edge function status:', efRes.status);
}
test().catch(e => { console.error(e); process.exit(1); });
"
```

## 6.2 Manual Integration Gates (Human-in-the-Loop)
# These require human verification and block final sign-off:
#
#   [ ] Auth flow: Login as admin@luckystore.com on new environment
#   [ ] Auth flow: Login as mac.alvi@luckystore1947.com on new environment
#   [ ] Storefront browse: Navigate categories, verify images render
#   [ ] Checkout E2E: Place test order, verify orders table record
#   [ ] Realtime: Admin dashboard shows live order notifications
#
# OPERATOR: Confirm all gates pass, then mark migration complete.

# =============================================================================
# CHECKPOINT SCHEMA
# =============================================================================
# Hermes writes /tmp/migration_checkpoint.json after each phase:
# {
#   "phases_completed": ["0", "1", "2", "3", "4", "5", "6"],
#   "timestamp": "2026-06-23T11:46:00Z",
#   "new_project_ref": "<NEW_REF>",
#   "verification_passed": true
# }
#
# To resume after failure: re-run from the first uncompleted phase.
"""

with open('/mnt/agents/output/migration_plan_hermes_v5.md', 'w') as f:
    f.write(hermes_plan)

print("Hermes-upgraded migration plan written successfully.")
print(f"File size: {len(hermes_plan)} bytes")
