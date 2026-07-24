#!/usr/bin/env node
/**
 * Repository secret scanner.
 * - Never prints matched secret values (path + pattern name + line only).
 * - Allows placeholder values in .env.example and synthetic self-test fixtures.
 * - Targets env-style credential assignments, private keys, and JWT literals —
 *   not ordinary source variables named token/password.
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..', '..');
const SELF = resolve(__dirname, 'secret_scan.js');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'build',
  'coverage',
  '.venv',
  '.hermes',
  'playwright-report',
  '.next',
  'dist',
  '.dart_tool',
  'Pods',
  'inspections',
  '.gradle',
  'DerivedData',
]);

const PLACEHOLDER_RE =
  /^(?:your[-_][a-z0-9_-]+[-_]here|your[-_](?:[a-z0-9]+[-_]){2,}[a-z0-9]+|<(?:placeholder|redacted)>|<your(?:[-_ ][a-z0-9]+){2,}>|changeme|replace-me|only_needed_for_ci_cd|false|true|\[(?:PASSWORD|REF|REGION|DUMMY_VALUE_FOR_DEV_ONLY)\]|sbp_\.\.\.|eyJhbG\.\.\.|\$\{[A-Z][A-Z0-9_]*\})$/i;

const CODEISH_LHS_RE =
  /^(?:const|let|var|final|late|static|private|public|protected|readonly|type|interface|function|async|await|return|if|for|while|class|String\??|int\??|bool\??|dynamic|List|Map|get|set)\b/;

const ENV_NAME_RE =
  /^((?:[A-Z][A-Z0-9_]*_)?(?:PASSWORD|PASS|SECRET|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY|SERVICE_ROLE)(?:_[A-Z0-9_]+)?)\s*=\s*(.*)$/;

const ENV_NAME_CASE_INSENSITIVE_RE =
  /^((?:[A-Z][A-Z0-9_]*_)?(?:PASSWORD|PASS|SECRET|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY|SERVICE_ROLE)(?:_[A-Z0-9_]+)?)\s*=\s*(.*)$/i;

const NAMED_ENV_RE =
  /^(?:export\s+)?(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|DATABASE_URL|DIRECT_DATABASE_URL|CLOUDFLARE_API_TOKEN|R2_SECRET_ACCESS_KEY|R2_ACCESS_KEY_ID|META_APP_SECRET|WHATSAPP_ACCESS_TOKEN|WHATSAPP_VERIFY_TOKEN|SSLCOMMERZ_STORE_PASSWORD|OPENAI_API_KEY)\s*=\s*(.*)$/i;

function stripQuotes(val) {
  const v = val.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function isPlaceholderValue(raw) {
  const val = stripQuotes(raw).trim();
  if (!val) return true;
  if (PLACEHOLDER_RE.test(val)) return true;
  // Explicit environment lookups — not literal secrets.
  if (/^process\.env(?:\.[A-Z_][A-Z0-9_]*|\[['"][A-Z_][A-Z0-9_]*['"]\])$/i.test(val)) return true;
  if (/^import\.meta\.env\.[A-Z_][A-Z0-9_]*$/i.test(val)) return true;
  if (/^Deno\.env\.get\(['"][A-Z_][A-Z0-9_]*['"]\)$/i.test(val)) return true;
  if (/^(?:Platform\.environment|dotenv\.env|os\.environ)\[['"][A-Z_][A-Z0-9_]*['"]\]$/i.test(val)) return true;
  if (/^getenv\(['"][A-Z_][A-Z0-9_]*['"]\)$/i.test(val)) return true;
  if (/^env\(['"]?[A-Z_][A-Z0-9_]*['"]?\)$/i.test(val)) return true;
  if (/^(true|false|null|undefined|None|nil)$/i.test(val)) return true;
  return false;
}

function shouldSkipPath(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  const fileName = rel.split('/').pop() || '';

  if (resolve(filePath) === SELF) return true;
  if (fileName === '.env.example') return false;

  if (rel.endsWith('.dev.vars') || rel.includes('/.dev.vars')) return true;
  if (rel === '.env' || rel.startsWith('.env.') || rel.endsWith('/.env') || rel.includes('/.env.')) {
    return true;
  }
  if (rel.startsWith('apps/admin_web/.env')) return true;
  if (rel.startsWith('apps/customer_storefront/.env')) return true;
  if (rel.startsWith('apps/mobile_app/.env')) return true;
  if (rel.startsWith('apps/mobile_app/env/')) return true;
  if (rel.startsWith('apps/mobile_app/.dart_tool/')) return true;
  if (rel.startsWith('apps/mobile_app/flutter/')) return true;
  if (rel.startsWith('apps/mobile_app/ios/Pods/')) return true;
  if (rel.startsWith('apps/mobile_app/inspections/')) return true;
  if (rel.startsWith('apps/mobile_app/build/')) return true;
  if (rel.startsWith('apps/customer_storefront/.next/')) return true;
  if (rel.startsWith('apps/customer_storefront/dist/')) return true;
  if (rel.startsWith('apps/admin_web/dist/')) return true;
  if (rel.startsWith('dist_public/')) return true;
  if (rel.includes('.vercel')) return true;
  if (rel.startsWith('lucky-store-brand-guidelines/')) return true;
  if (rel.startsWith('scripts/data/')) return true;
  if (rel.startsWith('_plans/')) return true;
  if (rel.startsWith('supabase/tests/.env.test')) return true;
  if (rel.startsWith('apps/mobile_app/assets/address_selection.html')) return true;
  if (rel.includes('.venv/')) return true;
  if (rel.includes('node_modules/')) return true;
  if (rel.includes('/Pods/')) return true;

  if (
    rel.endsWith('.wasm') ||
    rel.endsWith('.snapshot') ||
    rel.endsWith('.xcframework') ||
    rel.endsWith('.framework') ||
    rel.endsWith('.dSYM')
  ) {
    return true;
  }

  return false;
}

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf',
  '.zip', '.gz', '.tar', '.exe', '.dll', '.so', '.dylib', '.db', '.sqlite', '.css',
  '.map', '.lock',
]);

let exitCode = 0;
let findingCount = 0;

function reportFinding(patternName, rel, lineNumber) {
  console.log(`[SECRET] ${patternName} in ${rel}:${lineNumber}`);
  findingCount += 1;
  exitCode = 1;
}

function isCaseInsensitiveEnvContext(rel, trimmed) {
  const fileName = rel.split('/').pop() || '';
  return (
    /^export\s+/i.test(trimmed) ||
    fileName === '.env' ||
    fileName.startsWith('.env.') ||
    fileName.endsWith('.env.example') ||
    /\.(?:sh|bash|zsh)$/i.test(fileName)
  );
}

function classifyEnvAssignment(rel, line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  // Prose / docs mentioning the pattern name without a real value.
  if (/detect\s+[A-Z0-9_]*PASSWORD/i.test(trimmed)) return null;
  if (/PASSWORD\s*=\s*;?\s*$/i.test(trimmed)) return null;

  const assignment = trimmed.replace(/^export\s+/i, '');
  if (CODEISH_LHS_RE.test(assignment)) return null;

  let m = assignment.match(NAMED_ENV_RE);
  if (m) {
    const [, name, value] = m;
    if (isPlaceholderValue(value)) return null;
    if (/URL$/i.test(name)) {
      const passwordMatch = stripQuotes(value).match(/^postgres(?:ql)?:\/\/[^:\s/]+:([^@\s]+)@/i);
      if (passwordMatch) {
        if (isPlaceholderValue(passwordMatch[1])) return null;
        return 'DB URL with inline password';
      }
    }
    return `Credential assignment (${name})`;
  }

  m = assignment.match(ENV_NAME_RE);
  if (!m && isCaseInsensitiveEnvContext(rel, trimmed)) {
    m = assignment.match(ENV_NAME_CASE_INSENSITIVE_RE);
  }
  if (m) {
    const [, name, value] = m;
    if (isPlaceholderValue(value)) return null;
    return `Credential assignment (${name})`;
  }

  return null;
}

function scanLine(rel, line, lineNumber) {
  const envHit = classifyEnvAssignment(rel, line);
  if (envHit) {
    reportFinding(envHit, rel, lineNumber);
  }

  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) {
    reportFinding('Private key block', rel, lineNumber);
  }

  if (/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/.test(line)) {
    reportFinding('JWT-like token', rel, lineNumber);
  }

  const inlinePasswordMatch = line.match(/[?&]password=([^\s&"']+)/i);
  if (inlinePasswordMatch && !isPlaceholderValue(inlinePasswordMatch[1])) {
    reportFinding('Inline connection password parameter', rel, lineNumber);
  }
}

function scanContent(rel, content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    scanLine(rel, lines[i], i + 1);
  }
}

function scanFile(filePath) {
  if (shouldSkipPath(filePath)) return;

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  scanContent(rel, content);
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.venv')) walk(full);
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (BINARY_EXT.has(ext)) continue;

    scanFile(full);
  }
}

/** Synthetic fixtures — no real credentials. Used by --self-test. */
function runSelfTest() {
  const cases = [
    {
      name: 'detects PASSWORD assignment',
      content: 'MANAGER_PASSWORD=NotARealPassword123\n',
      expectFinding: true,
      expectedCount: 1,
      redactedValue: 'NotARealPassword123',
    },
    {
      name: 'detects exported lowercase PASSWORD assignment',
      content: 'export manager_password=synthetic-exported-credential\n',
      expectFinding: true,
      expectedCount: 1,
      redactedValue: 'synthetic-exported-credential',
    },
    {
      name: 'detects bare PASSWORD assignment',
      content: 'PASSWORD=synthetic-bare-credential\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'detects exported bare lowercase token assignment',
      content: 'export token=synthetic-bare-token\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'detects lowercase PASSWORD in env example',
      rel: '.env.example',
      content: 'manager_password=synthetic-env-credential\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'allows placeholder PASSWORD',
      content: 'MANAGER_PASSWORD=your-manager-password-here\n',
      expectFinding: false,
    },
    {
      name: 'rejects incomplete your-prefix placeholder',
      content: 'MANAGER_PASSWORD=your-secret\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'rejects arbitrary angle-bracket placeholder',
      content: 'MANAGER_PASSWORD=<credential>\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'ignores Dart password controller',
      content: '  final _passwordController = TextEditingController();\n',
      expectFinding: false,
    },
    {
      name: 'ignores const token from env',
      content: 'const token = process.env.WHATSAPP_VERIFY_TOKEN;\n',
      expectFinding: false,
    },
    {
      name: 'ignores ordinary lowercase code token assignment',
      content: 'continuationToken = nextPageToken;\n',
      expectFinding: false,
    },
    {
      name: 'detects private key header',
      content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKFAKE\n',
      expectFinding: true,
    },
    {
      name: 'detects JWT-like token',
      content:
        'AUTH=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGVzdHNpZ25hdHVyZXZhbHVlaGVyZQ\n',
      expectFinding: true,
    },
    {
      name: 'detects JWT-like token on line containing example text',
      content:
        'EXAMPLE_AUTH=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGVzdHNpZ25hdHVyZXZhbHVlaGVyZQ # example\n',
      expectFinding: true,
    },
    {
      name: 'detects Cloudflare API token name',
      content: 'CLOUDFLARE_API_TOKEN=cf_not_a_real_token_value\n',
      expectFinding: true,
    },
    {
      name: 'detects Meta app secret',
      content: 'META_APP_SECRET=meta_not_a_real_secret\n',
      expectFinding: true,
    },
    {
      name: 'detects named payment credential',
      content: 'SSLCOMMERZ_STORE_PASSWORD=synthetic-payment-credential\n',
      expectFinding: true,
      expectedCount: 1,
      redactedValue: 'synthetic-payment-credential',
    },
    {
      name: 'rejects deceptive dummy-prefixed credential',
      content: 'INTEGRATION_SECRET=dummy-but-credential-shaped\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'evaluates env example values individually',
      rel: 'apps/example/.env.example',
      content:
        'SUPABASE_DB_PASSWORD=your-database-password-here\nCLOUDFLARE_API_TOKEN=synthetic-literal-credential\n',
      expectFinding: true,
      expectedCount: 1,
      redactedValue: 'synthetic-literal-credential',
      expectPathScanned: true,
    },
    {
      name: 'rejects deceptive database URL password prefix',
      content: 'DATABASE_URL=postgresql://user:dummy-but-real@db.example.invalid/app\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'allows bounded database URL password placeholder',
      content: 'DATABASE_URL=postgresql://user:your-database-password-here@db.example.invalid/app\n',
      expectFinding: false,
    },
    {
      name: 'rejects deceptive query password prefix',
      content: 'URL=https://example.invalid?password=test-but-real\n',
      expectFinding: true,
      expectedCount: 1,
    },
    {
      name: 'allows bounded query password placeholder',
      content: 'URL=https://example.invalid?password=[PASSWORD]\n',
      expectFinding: false,
    },
    {
      name: 'allows placeholder Cloudflare token',
      content: 'CLOUDFLARE_API_TOKEN=your-cloudflare-api-token-here\n',
      expectFinding: false,
    },
    {
      name: 'ignores docs prose about PASSWORD=',
      content: '      - detect PASSWORD=;\n',
      expectFinding: false,
    },
  ];

  let failed = 0;
  for (const tc of cases) {
    const hits = [];
    // Local capture without mutating global counters
    const origLog = console.log;
    const findings = [];
    console.log = (msg) => {
      if (String(msg).startsWith('[SECRET]')) findings.push(msg);
    };
    const savedExit = exitCode;
    const savedCount = findingCount;
    exitCode = 0;
    findingCount = 0;
    scanContent(tc.rel || 'fixture', tc.content);
    console.log = origLog;
    const found = findingCount > 0;
    const countMatches = tc.expectedCount === undefined || findingCount === tc.expectedCount;
    const valueRedacted =
      tc.redactedValue === undefined ||
      findings.every((finding) => !String(finding).includes(tc.redactedValue));
    const pathScanned =
      tc.expectPathScanned === undefined ||
      !shouldSkipPath(resolve(ROOT, tc.rel));
    exitCode = savedExit;
    findingCount = savedCount;
    hits.push(...findings);

    const ok = found === tc.expectFinding && countMatches && valueRedacted && pathScanned;
    if (!ok) {
      failed += 1;
      console.log(
        `[FAIL] ${tc.name} (expected finding=${tc.expectFinding}, count=${findings.length}, valueRedacted=${valueRedacted}, pathScanned=${pathScanned})`,
      );
    } else {
      console.log(`[PASS] ${tc.name}`);
    }
  }

  if (failed > 0) {
    console.log(`Self-test failed: ${failed}/${cases.length}`);
    process.exit(1);
  }
  console.log(`Self-test passed: ${cases.length}/${cases.length}`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  runSelfTest();
}

walk(ROOT);

if (exitCode === 0) {
  console.log('No secrets leaked in repository files.');
} else {
  console.log(`Secret scan failed: ${findingCount} finding(s). Values redacted.`);
}
process.exit(exitCode);
