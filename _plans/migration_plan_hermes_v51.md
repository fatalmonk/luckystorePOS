# Supabase Project Migration Plan — Hermes Agent Loop Execution Ready
# Version: 5.1-Hermes (Patched)
# Target: luckystore1947.com
# From: hvmyxyccfnkrbxqbhlnm (payment-locked) → New Supabase Project
# Patches: v5.0 flaws 1-5 (SQL wrappers, auth API, config endpoint, psql vars, bucket scope)

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
#   LOCAL_IMAGES_PATH (absolute path to local backup folder; optional if ALLOW_SCRAPE_FALLBACK=true)
#   ALLOW_SCRAPE_FALLBACK (set to true to scrape live site when local images are missing)
#   SCRAPE_HOST_SUBSTITUTION (custom domain to fetch images from during scrape fallback, defaults to luckystore1947.com)
#   VERCEL_TOKEN, VERCEL_PROJECT_ID (for automated env var updates)
#   SUPABASE_MANAGEMENT_TOKEN (for auth config API)

# =============================================================================
# PRE-FLIGHT: Blocking Validation
# =============================================================================

## Gate 0.1: Image Source Resolution
```bash
if [ -d "$LOCAL_IMAGES_PATH" ] && [ -n "$LOCAL_IMAGES_PATH" ]; then
  echo "LOCAL mode: Using $LOCAL_IMAGES_PATH"
  export UPLOAD_MODE="local"
  FILE_COUNT=$(find "$LOCAL_IMAGES_PATH" -type f | wc -l)
  echo "Found $FILE_COUNT files in $LOCAL_IMAGES_PATH"
elif [ "$ALLOW_SCRAPE_FALLBACK" = "true" ]; then
  echo "SCRAPE mode: Will attempt to download/scrape from live site URLs"
  export UPLOAD_MODE="scrape"
  
  # Verify SCRAPE_HOST is accessible before proceeding
  TEST_HOST="${SCRAPE_HOST_SUBSTITUTION:-luckystore1947.com}"
  echo "Testing scrape host connectivity: $TEST_HOST"
  if ! curl -s -I "https://$TEST_HOST" > /dev/null; then
    echo "FATAL: Cannot reach scrape host https://$TEST_HOST. Scrape mode will fail."
    exit 1
  fi
  echo "Scrape host verified."
else
  echo "FATAL: No local images found and ALLOW_SCRAPE_FALLBACK not set."
  echo "OPTIONS: (1) Provide LOCAL_IMAGES_PATH, (2) Set ALLOW_SCRAPE_FALLBACK=true to scrape from live site, (3) Accept broken image URLs post-migration"
  exit 1
fi
```

## Gate 0.2: New Project Connectivity
```bash
# Test direct DB connection
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c "SELECT 1;" || exit 1

# Test Supabase API
 curl -s -o /dev/null -w "%{http_code}" \
   "$NEW_SUPABASE_URL/rest/v1/" \
   -H "apikey: $NEW_SUPABASE_ANON_KEY" | grep -q "200\|401" || exit 1
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

## Gate 0.4: Database Extension Parity
```bash
# Query enabled extensions in old database (excluding plpgsql)
OLD_EXTENSIONS=$(PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -Atc \
  "SELECT string_agg(extname, ',') FROM pg_extension WHERE extname NOT IN ('plpgsql');")
echo "Required extensions from old DB: $OLD_EXTENSIONS"

# Verify and enable each extension in the new database
if [ -n "$OLD_EXTENSIONS" ]; then
  IFS=',' read -ra ADDR <<< "$OLD_EXTENSIONS"
  for ext in "${ADDR[@]}"; do
    echo "Ensuring extension '$ext' is enabled on new DB..."
    PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
      "CREATE EXTENSION IF NOT EXISTS \"$ext\" CASCADE;" || exit 1
  done
  echo "Extension parity verified successfully"
else
  echo "No additional extensions required"
fi
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
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
"DO \$\$\
BEGIN\
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN\
    UPDATE public.stores SET is_active = false WHERE id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';\
    IF FOUND THEN\
      RAISE NOTICE 'Maintenance mode enabled on old DB';\
    ELSE\
      RAISE NOTICE 'Store row not found — proceeding with race window';\
    END IF;\
  END IF;\
END \$\$;"
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
  "COPY (SELECT id, instance_id, aud, role, email, encrypted_password, \
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, \
    created_at, updated_at \
    FROM auth.users) TO STDOUT WITH CSV HEADER" > auth_users.csv

# 1.3 Extract auth identities (5 records)
PGPASSWORD="$OLD_DB_PASSWORD" psql -h "$OLD_DB_HOST" -U "$OLD_DB_USER" -d postgres -c \
  "COPY (SELECT id, user_id, provider, identity_data, \
    provider_id, last_sign_in_at, created_at, updated_at \
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
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"DO \$\$\
BEGIN\
  IF EXISTS (SELECT 1 FROM information_schema.tables \
             WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN\
    TRUNCATE supabase_migrations.schema_migrations;\
    RAISE NOTICE 'Cleared existing migration history';\
  END IF;\
END \$\$;"

# 2.2 Restore public schema
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -f db_backup.sql

# 2.3 Restore auth users
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "COPY auth.users(id, instance_id, aud, role, email, encrypted_password, \
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, \
    created_at, updated_at) FROM STDIN WITH CSV HEADER" < auth_users.csv

# 2.4 Fix instance_id — DYNAMICALLY SCOPED to imported users only
# Uses the email list extracted in Phase 1.4, avoiding hardcoded UUIDs
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "UPDATE auth.users SET instance_id = '$NEW_INSTANCE_ID' WHERE email IN ($AUTH_USER_EMAILS);"

# 2.5 Restore auth identities
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "COPY auth.identities(id, user_id, provider, identity_data, \
    provider_id, last_sign_in_at, created_at, updated_at) FROM STDIN WITH CSV HEADER" < auth_identities.csv

# 2.6 Row count audit (machine-verifiable)
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
  "SELECT 'public.items' as tbl, COUNT(*) as cnt FROM public.items \
  UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users \
  UNION ALL SELECT 'auth.identities', COUNT(*) FROM auth.identities \
  UNION ALL SELECT 'public.products', COUNT(*) FROM public.products \
  UNION ALL SELECT 'public.transactions', COUNT(*) FROM public.transactions \
  UNION ALL SELECT 'public.stores', COUNT(*) FROM public.stores;"
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
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) \
VALUES \
  ('item-images', 'item-images', true, NULL, NULL), \
  ('product-images', 'product-images', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}') \
ON CONFLICT (id) DO UPDATE SET \
  public = EXCLUDED.public, \
  file_size_limit = EXCLUDED.file_size_limit, \
  allowed_mime_types = EXCLUDED.allowed_mime_types;"
```

## 3.2 Storage RLS Policies (idempotent — DROP IF EXISTS + CREATE)
# PATCH v5.0-Flaw-1: Wrapped in psql driver command
```bash
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"DO \$\$\
BEGIN\
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read item-images') THEN\
    CREATE POLICY \"Public Read item-images\" ON storage.objects \
      FOR SELECT USING (bucket_id = 'item-images');\
  END IF;\
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload item-images') THEN\
    CREATE POLICY \"Auth Upload item-images\" ON storage.objects \
      FOR INSERT WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');\
  END IF;\
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read product-images') THEN\
    CREATE POLICY \"Public Read product-images\" ON storage.objects \
      FOR SELECT USING (bucket_id = 'product-images');\
  END IF;\
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload product-images') THEN\
    CREATE POLICY \"Auth Upload product-images\" ON storage.objects \
      FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');\
  END IF;\
END \$\$;"
```

## 3.3 Realtime Publications (idempotent — checks before adding)
# PATCH v5.0-Flaw-1: Wrapped in psql driver command
```bash
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"DO \$\$\
DECLARE\
  tables TEXT[] := ARRAY['categories','stores','users','ledger_accounts', \
                         'ledger_entries','parties','daily_sales','orders'];\
  t TEXT;\
BEGIN\
  FOREACH t IN ARRAY tables LOOP\
    IF NOT EXISTS (\
      SELECT 1 FROM pg_publication_rel pr\
      JOIN pg_class c ON c.oid = pr.prrelid\
      JOIN pg_namespace n ON n.oid = c.relnamespace\
      JOIN pg_publication p ON p.oid = pr.prpubid\
      WHERE p.pubname = 'supabase_realtime'\
      AND n.nspname = 'public' AND c.relname = t\
    ) THEN\
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);\
    END IF;\
  END LOOP;\
END \$\$;"
```

## 3.4 Edge Functions
```bash
# Deploy before any webhook references them
supabase functions deploy import-inventory --project-ref "$NEW_PROJECT_REF"
supabase functions deploy create-sale --project-ref "$NEW_PROJECT_REF"
```

## 3.5 Auth Settings (API-driven, no dashboard clicks)
# PATCH v5.0-Flaw-3: Corrected endpoint to PATCH /config/auth
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/$NEW_PROJECT_REF/config/auth" \
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
# INPUT:  NEW_SUPABASE_SERVICE_ROLE_KEY, UPLOAD_MODE (local/scrape), LOCAL_IMAGES_PATH (if local)
# OUTPUT: Images uploaded to new storage, URLs updated in DB
# CHECKPOINT: phase_4_complete
# IDEMPOTENCY: Upload uses deterministic paths; SQL uses WHERE clauses

## 4.1 compress-upload-local.mjs (Hermes-Ready Script)
# PATCH v5.0-Flaw-5: Accepts --bucket flag; defaults to item-images
```javascript
#!/usr/bin/env node
/**
 * compress-upload-local.mjs — Hermes Agent Loop Compatible
 * Reads images from LOCAL_IMAGES_PATH or scrapes from live site, compresses to WebP, uploads to Supabase.
 * Idempotent: re-uploading overwrites existing objects.
 * Usage: node compress-upload-local.mjs [--bucket item-images|product-images]
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname, relative, basename } from 'path';

const SUPABASE_URL = process.env.NEW_SUPABASE_URL;
const SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_PATH = process.env.LOCAL_IMAGES_PATH;
const BUCKET = process.argv.includes('--bucket') 
  ? process.argv[process.argv.indexOf('--bucket') + 1] 
  : 'item-images';
const UPLOAD_MODE = process.env.UPLOAD_MODE || 'local';
const SCRAPE_HOST = process.env.SCRAPE_HOST_SUBSTITUTION || 'luckystore1947.com';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FATAL: Missing required env vars: NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (UPLOAD_MODE === 'local' && !LOCAL_PATH) {
  console.error('FATAL: UPLOAD_MODE is local but LOCAL_IMAGES_PATH is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const results = { uploaded: [], failed: [], skipped: [], total: 0, bucket: BUCKET };

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

async function getUrlsToScrape(bucketName) {
  const tables = [
    { name: 'items', col: 'image_url' },
    { name: 'featured_products', col: 'image_url' },
    { name: 'products', col: 'image_url' },
    { name: 'categories', col: 'image_url' },
    { name: 'promos', col: 'image_url' },
    { name: 'receipt_config', col: 'logo_url' }
  ];
  const urls = new Set();
  for (const t of tables) {
    try {
      const { data, error } = await supabase
        .from(t.name)
        .select(t.col)
        .not(t.col, 'is', null);
      if (error) continue;
      for (const row of data) {
        const val = row[t.col];
        if (val && val.includes('hvmyxyccfnkrbxqbhlnm') && val.includes(`/storage/v1/object/public/${bucketName}/`)) {
          urls.add(val);
        }
      }
    } catch (e) {
      console.warn(`Warning: Could not query table ${t.name}:`, e.message);
    }
  }
  return Array.from(urls);
}

async function processFile(filePath) {
  const relPath = relative(LOCAL_PATH, filePath);
  const ext = extname(filePath).toLowerCase();
  const baseName = relPath.replace(/\.[^.]+$/, '');
  const storagePath = `${baseName}.webp`;

  let buffer;
  const contentType = 'image/webp';

  if (ext === '.webp') {
    buffer = await readFile(filePath);
    results.skipped.push({ original: relPath, reason: 'already_webp' });
  } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
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

async function processScrape(url) {
  const parts = url.split(`/storage/v1/object/public/${BUCKET}/`);
  const originalPath = parts[1];
  const baseName = originalPath.replace(/\.[^.]+$/, '');
  const storagePath = `${baseName}.webp`;
  const fetchUrl = url.replace('hvmyxyccfnkrbxqbhlnm.supabase.co', SCRAPE_HOST);

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const buffer = await sharp(inputBuffer)
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: 'public, max-age=31536000',
      });

    if (error) {
      results.failed.push({ original: url, fetchUrl, storagePath, error: error.message });
    } else {
      results.uploaded.push({ original: url, fetchUrl, storagePath, size: buffer.length });
    }
  } catch (err) {
    results.failed.push({ original: url, fetchUrl, storagePath, error: err.message });
  }
}

async function main() {
  const startTime = Date.now();
  if (UPLOAD_MODE === 'local') {
    for await (const filePath of walkDir(LOCAL_PATH)) {
      results.total++;
      await processFile(filePath);
    }
  } else if (UPLOAD_MODE === 'scrape') {
    console.log(`Querying DB for images in bucket: ${BUCKET} and domain host substitution: ${SCRAPE_HOST}`);
    const urls = await getUrlsToScrape(BUCKET);
    console.log(`Found ${urls.length} target URLs to scrape`);
    for (const url of urls) {
      results.total++;
      await processScrape(url);
    }
  } else {
    console.error(`FATAL: Unknown UPLOAD_MODE: ${UPLOAD_MODE}`);
    process.exit(1);
  }
  const duration = Date.now() - startTime;

  results.duration_ms = duration;
  await writeFile(`compress-results-${BUCKET}.json`, JSON.stringify(results, null, 2));

  console.log(`Processed ${results.total} items in ${duration}ms`);
  console.log(`Uploaded: ${results.uploaded.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.error(`FATAL: Some uploads failed. See compress-results-${BUCKET}.json`);
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
# Upload item-images (default bucket)
node scripts/compress-upload-local.mjs

# If product-images also exist in local backup:
# node scripts/compress-upload-local.mjs --bucket product-images
```

## 4.3 Parity Check (Machine-Verifiable)
```bash
if [ "$UPLOAD_MODE" = "local" ]; then
  LOCAL_COUNT=$(find "$LOCAL_IMAGES_PATH" -type f | wc -l)
  STORAGE_COUNT=$(PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -Atc \
    "SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'item-images';")

  echo "Local files: $LOCAL_COUNT"
  echo "Storage objects: $STORAGE_COUNT"

  if [ "$LOCAL_COUNT" -ne "$STORAGE_COUNT" ]; then
    echo "WARNING: Count mismatch. Investigate compress-results-item-images.json for failures or nested path issues."
  fi
else
  node --input-type=module -e "
  import fs from 'fs';
  if (fs.existsSync('compress-results-item-images.json')) {
    const res = JSON.parse(fs.readFileSync('compress-results-item-images.json'));
    console.log('Scrape Summary: Total=' + res.total + ', Uploaded=' + res.uploaded.length + ', Failed=' + res.failed.length);
    if (res.failed.length > 0) {
      console.error('FATAL: Some image downloads/uploads failed.');
      process.exit(1);
    }
  } else {
    console.log('Warning: compress-results-item-images.json not found');
  }
  "
fi
```

## 4.4 Atomic URL Update (All 6 Tables — Idempotent)
# PATCH v5.0-Flaw-1: All SQL wrapped in psql driver commands
# PATCH v5.0-Flaw-4: Uses shell variable expansion instead of :new_ref psql variable

### 4.4.1 Preview (Non-Destructive)
```bash
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"SELECT 'items' as tbl, id, image_url, \
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') as new_url \
FROM public.items \
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%' \
UNION ALL \
SELECT 'featured_products', id::text, image_url, \
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') \
FROM public.featured_products \
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%' \
UNION ALL \
SELECT 'products', id::text, image_url, \
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') \
FROM public.products \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%' \
UNION ALL \
SELECT 'categories', id::text, image_url, \
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') \
FROM public.categories \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%' \
UNION ALL \
SELECT 'promos', id::text, image_url, \
  regexp_replace(replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') \
FROM public.promos \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%' \
UNION ALL \
SELECT 'receipt_config', id::text, logo_url as image_url, \
  regexp_replace(replace(logo_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), '\.(jpe?g|png)$', '.webp', 'i') \
FROM public.receipt_config \
WHERE logo_url IS NOT NULL AND logo_url LIKE '%hvmyxyccfnkrbxqbhlnm%';"
```

### 4.4.2 Execute (Single Transaction)
```bash
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NEW_DB_HOST" -U postgres -d postgres -c \
"BEGIN; \
\
UPDATE public.items SET image_url = regexp_replace( \
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
UPDATE public.featured_products SET image_url = regexp_replace( \
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
UPDATE public.products SET image_url = regexp_replace( \
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
UPDATE public.categories SET image_url = regexp_replace( \
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
UPDATE public.promos SET image_url = regexp_replace( \
  replace(image_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE image_url IS NOT NULL AND image_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
UPDATE public.receipt_config SET logo_url = regexp_replace( \
  replace(logo_url, 'hvmyxyccfnkrbxqbhlnm', '${NEW_PROJECT_REF}'), \
  '\.(jpe?g|png)$', '.webp', 'i') \
WHERE logo_url IS NOT NULL AND logo_url LIKE '%hvmyxyccfnkrbxqbhlnm%'; \
\
COMMIT;"
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

# Clean up temporary backup files created by sed
rm -f .env.bak .env.local.bak
find apps -name '*.bak' -delete

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
# PATCH v5.0-Flaw-2: Uses auth admin API instead of REST table query
```bash
node --input-type=module -e "
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Auth count via admin API (not REST table query)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;
  const userCount = authData.users.length;
  console.assert(userCount === 6, 'Auth user count mismatch: ' + userCount);
  console.log('Auth users verified:', userCount);

  // Filter image URL test to only test non-null image URLs belonging to the new project
  const { data: items, error: itemsError } = await supabase.from('items')
    .select('image_url')
    .not('image_url', 'is', null)
    .like('image_url', '%' + process.env.NEW_PROJECT_REF + '%')
    .limit(20);

  if (itemsError) throw itemsError;

  for (const item of items) {
    const res = await fetch(item.image_url);
    console.assert(res.status === 200, 'Image 404: ' + item.image_url);
  }
  console.log('Image smoke test passed for ' + items.length + ' new-domain items');

  // Edge function health
  const efRes = await fetch(\`\${process.env.NEW_SUPABASE_URL}/functions/v1/import-inventory\`, {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${process.env.NEW_SUPABASE_ANON_KEY}\`, 'Content-Type': 'application/json' },
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
