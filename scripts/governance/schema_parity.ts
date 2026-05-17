import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
const stagingEnv = resolve(process.cwd(), '.env.certify.staging');
if (fs.existsSync(stagingEnv)) {
  dotenv.config({ path: stagingEnv });
}
dotenv.config({ path: resolve(process.cwd(), '.env') });

const STAGING_URL = process.env.STAGING_DATABASE_URL || process.env.SUPABASE_URL;
const LOCAL_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

type Status = 'VERIFIED' | 'DRIFT' | 'MISSING' | 'UNKNOWN';

interface ParityItem {
  key: string;
  status: Status;
  local_hash?: string;
  staging_hash?: string;
}

interface CategoryReport {
  match: boolean;
  count: number;
  drift_count: number;
  items: ParityItem[];
}

const QUERIES = {
  rls: `
    SELECT 
      schemaname || '.' || tablename || '.' || policyname as key,
      md5(schemaname || '|' || tablename || '|' || policyname || '|' || permissive || '|' || roles::text || '|' || cmd || '|' || COALESCE(qual, '') || '|' || COALESCE(with_check, '')) as hash
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY 1;
  `,
  triggers: `
    SELECT 
      n.nspname || '.' || c.relname || '.' || t.tgname as key,
      md5(t.tgname || '|' || c.relname || '|' || pg_get_triggerdef(t.oid)) as hash
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.tgisinternal = false
    ORDER BY 1;
  `,
  indexes: `
    SELECT 
      schemaname || '.' || tablename || '.' || indexname as key,
      md5(schemaname || '|' || tablename || '|' || indexname || '|' || indexdef) as hash
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY 1;
  `,
  grants: `
    SELECT 
      table_schema || '.' || table_name || '.' || grantee || '.' || privilege_type as key,
      md5(table_schema || '|' || table_name || '|' || grantee || '|' || privilege_type || '|' || is_grantable) as hash
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'service_role')
    ORDER BY 1;
  `
};

function getHashes(url: string, query: string): Map<string, string> {
  try {
    const output = execSync(`psql "${url}" -tAc "${query}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
    const lines = output.trim().split('\n');
    const hashes = new Map<string, string>();
    for (const line of lines) {
      if (!line) continue;
      const [key, hash] = line.split('|');
      hashes.set(key, hash);
    }
    return hashes;
  } catch (e: any) {
    throw new Error(`Failed to fetch hashes: ${e.message}`);
  }
}

function compareCategory(local: Map<string, string>, staging: Map<string, string>): CategoryReport {
  const allKeys = Array.from(new Set([...local.keys(), ...staging.keys()])).sort();
  const items: ParityItem[] = [];
  let driftCount = 0;

  for (const key of allKeys) {
    const l = local.get(key);
    const s = staging.get(key);

    if (l === s) {
      items.push({ key, status: 'VERIFIED', local_hash: l, staging_hash: s });
    } else if (!l) {
      items.push({ key, status: 'MISSING', staging_hash: s });
      driftCount++;
    } else if (!s) {
      items.push({ key, status: 'MISSING', local_hash: l });
      driftCount++;
    } else {
      items.push({ key, status: 'DRIFT', local_hash: l, staging_hash: s });
      driftCount++;
    }
  }

  return {
    match: driftCount === 0,
    count: allKeys.length,
    drift_count: driftCount,
    items
  };
}

async function main() {
  console.log('🏗  STARTING SCHEMA PARITY VALIDATION (Objective 2)\n');

  try {
    const report: any = {
      timestamp: new Date().toISOString(),
      categories: {}
    };

    for (const [cat, query] of Object.entries(QUERIES)) {
      console.log(`[SCHEMA-PARITY] Validating ${cat.toUpperCase()}...`);
      const local = getHashes(LOCAL_URL, query);
      const staging = getHashes(STAGING_URL, query);
      report.categories[cat] = compareCategory(local, staging);
    }

    const reportPath = resolve(process.cwd(), 'artifacts/governance/schema-parity-report.json');
    fs.mkdirSync(resolve(process.cwd(), 'artifacts/governance'), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n--- PARITY SUMMARY ---');
    let overallMatch = true;
    for (const [cat, data] of Object.entries(report.categories) as [string, CategoryReport][]) {
      console.log(`${cat.toUpperCase().padEnd(10)}: ${data.match ? '✅ VERIFIED' : '❌ DRIFT (' + data.drift_count + ' items)'}`);
      if (!data.match) overallMatch = false;
    }

    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    if (!overallMatch) {
      process.exit(1);
    } else {
      console.log('\n✨ ALL STRUCTURAL ELEMENTS ARE IN PERFECT SYNC!');
    }

  } catch (e) {
    console.error('\n❌ Validation failed:', e);
    process.exit(1);
  }
}

main();
