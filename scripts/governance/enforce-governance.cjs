#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const repoRoot = path.resolve(args['repo-root'] || process.cwd());
const artifactsDir = path.resolve(args['artifacts-dir'] || path.join(repoRoot, 'artifacts', 'governance'));
const compareArtifactsDir = args['compare-artifacts-dir']
  ? path.resolve(args['compare-artifacts-dir'])
  : null;
const baselinePath = path.resolve(
  args.baseline || path.join(repoRoot, 'scripts', 'governance', 'baseline.json'),
);
const writeBaseline = Boolean(args['write-baseline']);

const requiredArtifacts = [
  'function_signature_registry.json',
  'migration_dependency_graph.json',
  'object_ownership_graph.json',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function normalizeForDeterminism(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForDeterminism(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const normalized = {};
  const keys = Object.keys(value)
    .filter((key) => key !== 'timestamp' && key !== 'generated_at')
    .sort();

  for (const key of keys) {
    normalized[key] = normalizeForDeterminism(value[key]);
  }
  return normalized;
}

function loadArtifact(name, baseDir) {
  const filePath = path.join(baseDir, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing governance artifact: ${filePath}`);
  }
  return readJson(filePath);
}

function artifactHashes(baseDir) {
  const hashes = {};
  for (const name of requiredArtifacts) {
    const filePath = path.join(baseDir, name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing governance artifact for hashing: ${filePath}`);
    }
    const normalized = normalizeForDeterminism(readJson(filePath));
    hashes[name] = sha(JSON.stringify(normalized));
  }
  return hashes;
}

function compareHashes(leftDir, rightDir) {
  const left = artifactHashes(leftDir);
  const right = artifactHashes(rightDir);
  const mismatches = [];
  for (const name of Object.keys(left)) {
    if (left[name] !== right[name]) {
      mismatches.push({
        artifact: name,
        left: left[name],
        right: right[name],
      });
    }
  }
  return { left, right, mismatches };
}

function collectSearchPathFindings(registryReport) {
  const findings = [];
  for (const [signature, fn] of Object.entries(registryReport.registry || {})) {
    const hasRisk = (fn.risks || []).some(
      (risk) => risk.type === 'security_definer_missing_search_path',
    );
    if (!hasRisk) continue;
    findings.push({
      id: signature,
      signature,
      created_by: fn.created_by || 'unknown',
    });
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

function collectOrphanPrivilegeFindings(registryReport) {
  return (registryReport.conflicts || [])
    .filter((conflict) => conflict.type === 'orphan_grant' || conflict.type === 'orphan_revoke')
    .map((conflict) => {
      const migration = conflict.grant_migration || conflict.revoke_migration || 'unknown';
      return {
        id: `${conflict.type}:${conflict.function}:${conflict.role || 'n/a'}:${migration}`,
        type: conflict.type,
        function: conflict.function,
        role: conflict.role || 'n/a',
        migration,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function collectForwardDependencyFindings(dependencyReport) {
  const findings = [];
  for (const [migration, info] of Object.entries(dependencyReport.dependency_graph || {})) {
    for (const risk of info.risks || []) {
      if (risk.type !== 'forward_dependency') continue;
      findings.push({
        id: `${migration}:${risk.object}:${risk.depends_on_migration}`,
        migration,
        object: risk.object,
        depends_on_migration: risk.depends_on_migration,
      });
    }
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

const runtimeScanRoots = [
  'apps/mobile_app/lib/features/sales',
  'apps/mobile_app/lib/offline',
  'apps/mobile_app/lib/features/reconciliation',
  'apps/mobile_app/lib/telemetry',
  'apps/mobile_app/lib/shared/providers',
  'apps/admin_web/src/lib/api',
  'apps/admin_web/src/types',
  'supabase/functions',
];

const runtimeScanExcludes = [
  'apps/mobile_app/lib/offline/db.g.dart',
];

const fieldPatterns = [
  { field: 'product_id', pattern: /\bproduct_id\b/ },
  { field: 'qty', pattern: /\bqty\b/ },
  { field: 'active', pattern: /\bactive\b/ },
  { field: 'full_name', pattern: /\bfull_name\b/ },
];

function shouldSkipLine(trimmed) {
  return (
    trimmed.length === 0 ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('--')
  );
}

function walkFiles(targetPath, files) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    files.push(targetPath);
    return;
  }
  for (const entry of fs.readdirSync(targetPath)) {
    walkFiles(path.join(targetPath, entry), files);
  }
}

function collectLegacyRuntimeFieldFindings(rootDir) {
  const files = [];
  for (const rel of runtimeScanRoots) {
    walkFiles(path.join(rootDir, rel), files);
  }

  const findings = [];
  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath).replaceAll(path.sep, '/');
    if (runtimeScanExcludes.includes(relativePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (shouldSkipLine(trimmed)) return;
      for (const { field, pattern } of fieldPatterns) {
        if (!pattern.test(line)) continue;
        const excerpt = trimmed.slice(0, 240);
        findings.push({
          id: `${field}:${relativePath}:${sha(excerpt)}`,
          field,
          file: relativePath,
          line: index + 1,
          excerpt,
        });
      }
    });
  }

  findings.sort((a, b) => a.id.localeCompare(b.id));
  return findings;
}

function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      version: 1,
      categories: {
        security_definer_missing_search_path: [],
        orphan_function_privileges: [],
        forward_dependencies: [],
        legacy_runtime_fields: [],
      },
    };
  }
  return readJson(filePath);
}

function buildBaseline(current) {
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    categories: {
      security_definer_missing_search_path: current.searchPath.map((entry) => entry.id),
      orphan_function_privileges: current.orphanPrivileges.map((entry) => entry.id),
      forward_dependencies: current.forwardDependencies.map((entry) => entry.id),
      legacy_runtime_fields: current.legacyFields.map((entry) => entry.id),
    },
  };
}

function diffAgainstBaseline(categoryName, currentEntries, baseline) {
  const allowed = new Set((baseline.categories?.[categoryName] || []).slice().sort());
  return currentEntries.filter((entry) => !allowed.has(entry.id));
}

function printCategory(title, entries, render) {
  if (entries.length === 0) return;
  console.error(`\n${title}`);
  for (const entry of entries) {
    console.error(`- ${render(entry)}`);
  }
}

function main() {
  const registryReport = loadArtifact('function_signature_registry.json', artifactsDir);
  const dependencyReport = loadArtifact('migration_dependency_graph.json', artifactsDir);
  loadArtifact('object_ownership_graph.json', artifactsDir);

  const current = {
    searchPath: collectSearchPathFindings(registryReport),
    orphanPrivileges: collectOrphanPrivilegeFindings(registryReport),
    forwardDependencies: collectForwardDependencyFindings(dependencyReport),
    legacyFields: collectLegacyRuntimeFieldFindings(repoRoot),
  };

  if (writeBaseline) {
    const baseline = buildBaseline(current);
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`Wrote governance baseline: ${baselinePath}`);
    return;
  }

  const baseline = loadBaseline(baselinePath);
  const regressions = {
    searchPath: diffAgainstBaseline(
      'security_definer_missing_search_path',
      current.searchPath,
      baseline,
    ),
    orphanPrivileges: diffAgainstBaseline(
      'orphan_function_privileges',
      current.orphanPrivileges,
      baseline,
    ),
    forwardDependencies: diffAgainstBaseline(
      'forward_dependencies',
      current.forwardDependencies,
      baseline,
    ),
    legacyFields: diffAgainstBaseline(
      'legacy_runtime_fields',
      current.legacyFields,
      baseline,
    ),
  };

  let compareResult = null;
  if (compareArtifactsDir) {
    compareResult = compareHashes(artifactsDir, compareArtifactsDir);
  }

  const hasRegressions =
    regressions.searchPath.length > 0 ||
    regressions.orphanPrivileges.length > 0 ||
    regressions.forwardDependencies.length > 0 ||
    regressions.legacyFields.length > 0 ||
    (compareResult && compareResult.mismatches.length > 0);

  const summary = {
    generated_at: new Date().toISOString(),
    artifacts_dir: artifactsDir,
    compare_artifacts_dir: compareArtifactsDir,
    baseline: baselinePath,
    counts: {
      security_definer_missing_search_path: current.searchPath.length,
      orphan_function_privileges: current.orphanPrivileges.length,
      forward_dependencies: current.forwardDependencies.length,
      legacy_runtime_fields: current.legacyFields.length,
    },
    regressions: {
      security_definer_missing_search_path: regressions.searchPath.map((entry) => entry.id),
      orphan_function_privileges: regressions.orphanPrivileges.map((entry) => entry.id),
      forward_dependencies: regressions.forwardDependencies.map((entry) => entry.id),
      legacy_runtime_fields: regressions.legacyFields.map((entry) => entry.id),
      artifact_hash_mismatches: compareResult ? compareResult.mismatches : [],
    },
  };

  const summaryPath = path.join(artifactsDir, 'governance-enforcement-report.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Wrote governance enforcement report: ${summaryPath}`);

  if (!hasRegressions) {
    console.log('Governance enforcement passed: no regressions beyond baseline.');
    return;
  }

  console.error('Governance enforcement failed: deterministic regressions detected.');

  printCategory(
    'New SECURITY DEFINER functions missing explicit search_path',
    regressions.searchPath,
    (entry) => `${entry.signature} (${entry.created_by})`,
  );
  printCategory(
    'New orphan GRANT/REVOKE findings',
    regressions.orphanPrivileges,
    (entry) => `${entry.type} ${entry.function} in ${entry.migration}`,
  );
  printCategory(
    'New forward migration dependencies',
    regressions.forwardDependencies,
    (entry) => `${entry.migration} depends on ${entry.object} from ${entry.depends_on_migration}`,
  );
  printCategory(
    'New legacy runtime field references',
    regressions.legacyFields,
    (entry) => `${entry.file}:${entry.line} [${entry.field}] ${entry.excerpt}`,
  );
  if (compareResult && compareResult.mismatches.length > 0) {
    printCategory(
      'Governance artifact hash mismatches',
      compareResult.mismatches,
      (entry) => `${entry.artifact} ${entry.left} != ${entry.right}`,
    );
  }

  process.exit(1);
}

main();
