#!/usr/bin/env node

/**
 * Migration Dependency Inference Engine
 * 
 * Analyzes which migrations depend on which objects
 * Generates dependency graph to detect:
 * - unsafe replay (hardening before owner objects)
 * - orphan hardening (RLS without table)
 * - replacement chains (fix_X depends on object_Y)
 * - runtime-before-foundation violations
 * 
 * Output: migration_dependency_graph.json
 * 
 * Structure:
 * {
 *   "20260427000000_advisor_security_rls_and_functions.sql": {
 *     "sequence": 123,
 *     "timestamp": "20260427000000",
 *     "category": "hardening",
 *     "dependencies": {
 *       "objects": ["get_new_receipt", "receipt_counters"],
 *       "migrations": ["20260301000000_baseline_core_tables.sql"],
 *       "satisfied": true
 *     },
 *     "unsafe_assumptions": [],
 *     "risks": []
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.argv[2] || '/migrations';
const OUTPUT_DIR = process.argv[3] || '.';

class MigrationDependencyInference {
  constructor(migrationsDir) {
    this.migrationsDir = migrationsDir;
    this.migrations = [];
    this.dependencyGraph = {};
    this.objectOwners = {};
    this.risks = [];
  }

  loadMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      console.error(`Migrations directory not found: ${this.migrationsDir}`);
      return;
    }

    this.migrations = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Loaded ${this.migrations.length} migrations for dependency analysis`);
  }

  extractObjectReferencesFromMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');

    const references = {
      creates: [],
      uses: [],
      alters: [],
      grants: [],
      depends_on: new Set(),
    };

    // Track what this migration CREATES
    const createMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|FUNCTION|VIEW|POLICY|INDEX|TYPE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
    for (const match of createMatches) {
      references.creates.push(match[1].toLowerCase());
    }

    // Track what this migration USES/REFERENCES
    // This is conservative - looks for common patterns

    // ALTER TABLE / ALTER FUNCTION (depends on object)
    const alterMatches = content.matchAll(/ALTER\s+(?:TABLE|FUNCTION)\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
    for (const match of alterMatches) {
      const obj = match[1].toLowerCase();
      references.alters.push(obj);
      references.depends_on.add(obj);
    }

    // DROP TABLE / DROP FUNCTION (depends on object)
    const dropMatches = content.matchAll(/DROP\s+(?:TABLE|FUNCTION)\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
    for (const match of dropMatches) {
      const obj = match[1].toLowerCase();
      references.depends_on.add(obj);
    }

    // GRANT / REVOKE on FUNCTION (depends on function)
    const grantMatches = content.matchAll(/(?:GRANT|REVOKE)\s+[^O]+?\s+ON\s+(?:FUNCTION\s+)?(?:public\.)?(\w+)\s*\(/gi);
    for (const match of grantMatches) {
      const obj = match[1].toLowerCase();
      references.grants.push(obj);
      references.depends_on.add(obj);
    }

    // CREATE POLICY ... ON table_name (depends on table)
    const policyMatches = content.matchAll(/CREATE\s+POLICY\s+\w+\s+ON\s+(?:public\.)?(\w+)/gi);
    for (const match of policyMatches) {
      const obj = match[1].toLowerCase();
      references.depends_on.add(obj);
    }

    // CREATE TRIGGER ... ON table_name (depends on table)
    const triggerMatches = content.matchAll(/CREATE\s+TRIGGER\s+\w+\s+.*?\s+ON\s+(?:public\.)?(\w+)/gi);
    for (const match of triggerMatches) {
      const obj = match[1].toLowerCase();
      references.depends_on.add(obj);
    }

    // Function calls in SQL (conservative)
    const functionCalls = content.matchAll(/(?:SELECT|CALL|PERFORM)\s+(?:public\.)?(\w+)\s*\(/gi);
    for (const match of functionCalls) {
      const fn = match[1].toLowerCase();
      // Only add if it looks like a function (contains underscore or known patterns)
      if (fn.includes('_') || ['count', 'sum', 'avg', 'max', 'min'].includes(fn)) {
        if (!['count', 'sum', 'avg', 'max', 'min'].includes(fn)) {
          references.depends_on.add(fn);
        }
      }
    }

    return references;
  }

  buildObjectOwnerMap() {
    console.log('\nBuilding object owner map...');

    this.migrations.forEach(filename => {
      const refs = this.extractObjectReferencesFromMigration(filename);
      refs.creates.forEach(obj => {
        this.objectOwners[obj] = filename;
      });
    });

    console.log(`Object owner map: ${Object.keys(this.objectOwners).length} objects tracked`);
  }

  buildDependencyGraph() {
    console.log('\nBuilding migration dependency graph...');

    this.migrations.forEach((filename, index) => {
      const timestamp = filename.substring(0, 14);
      const category = this.categorizeMigration(filename);
      const refs = this.extractObjectReferencesFromMigration(filename);

      const deps = {
        sequence: index,
        timestamp,
        category,
        dependencies: {
          objects: Array.from(refs.depends_on),
          migrations: [],
          satisfied: true,
          unsatisfied_objects: [],
        },
        unsafe_assumptions: [],
        risks: [],
      };

      // Map object dependencies to migration dependencies
      refs.depends_on.forEach(obj => {
        const ownerMigration = this.objectOwners[obj];
        if (ownerMigration) {
          const ownerTimestamp = ownerMigration.substring(0, 14);
          if (ownerTimestamp > timestamp) {
            // Dependency on future migration - UNSAFE
            deps.dependencies.satisfied = false;
            deps.dependencies.unsatisfied_objects.push({
              object: obj,
              owner: ownerMigration,
              owner_timestamp: ownerTimestamp,
              issue: 'forward_dependency',
            });
            deps.risks.push({
              type: 'forward_dependency',
              object: obj,
              depends_on_migration: ownerMigration,
              severity: 'critical',
            });
          } else {
            if (!deps.dependencies.migrations.includes(ownerMigration)) {
              deps.dependencies.migrations.push(ownerMigration);
            }
          }
        } else {
          // Object not found in any migration - UNSAFE ASSUMPTION
          deps.unsafe_assumptions.push({
            object: obj,
            issue: 'object_not_found',
          });
          deps.risks.push({
            type: 'missing_object',
            object: obj,
            severity: 'high',
          });
        }
      });

      // Specific risk checks

      // Hardening without owner (RLS before table)
      if (category === 'hardening' && deps.dependencies.migrations.length === 0) {
        deps.risks.push({
          type: 'dangling_hardening',
          severity: 'high',
          message: 'Hardening migration with no explicit dependencies - may run before owner objects',
        });
      }

      // Replacement depending on missing objects
      if (category === 'replacement' && deps.unsafe_assumptions.length > 0) {
        deps.risks.push({
          type: 'orphan_replacement',
          severity: 'high',
          message: 'Replacement migration depends on non-existent objects',
        });
      }

      // Runtime depending on incomplete foundational
      if (category === 'runtime-only' && !deps.dependencies.satisfied) {
        deps.risks.push({
          type: 'runtime_before_foundation',
          severity: 'critical',
          message: 'Runtime migration depends on not-yet-created foundation',
        });
      }

      this.dependencyGraph[filename] = deps;
    });

    console.log(`Dependency graph built: ${Object.keys(this.dependencyGraph).length} migrations analyzed`);
  }

  categorizeMigration(filename) {
    if (/baseline|core|table|schema/i.test(filename)) return 'foundational';
    if (/extension|pgroonga|pgaudit/i.test(filename)) return 'extension';
    if (/rpc|function|procedure/i.test(filename)) return 'runtime-only';
    if (/security|rls|policy|grant|hardening|audit/i.test(filename)) return 'hardening';
    if (/fix_|repair_|replace_/i.test(filename)) return 'replacement';
    if (/deprecated|remove_|delete_/i.test(filename)) return 'dead';
    return 'uncategorized';
  }

  detectUnsafePatterns() {
    console.log('\nDetecting unsafe dependency patterns...');

    let criticalCount = 0;
    let highCount = 0;

    Object.entries(this.dependencyGraph).forEach(([filename, deps]) => {
      // Forward dependencies are critical
      if (!deps.dependencies.satisfied) {
        criticalCount += deps.risks.filter(r => r.severity === 'critical').length;
      }

      // Dangling hardening is high risk
      if (deps.risks.some(r => r.type === 'dangling_hardening')) {
        highCount++;
      }

      // Missing objects are high risk
      if (deps.unsafe_assumptions.length > 0) {
        highCount++;
      }
    });

    console.log(`Critical dependency issues: ${criticalCount}`);
    console.log(`High-risk patterns: ${highCount}`);
  }

  generateReport(outputDir) {
    console.log(`\nGenerating dependency report to ${outputDir}...`);

    const report = {
      timestamp: new Date().toISOString(),
      migration_count: this.migrations.length,
      dependency_graph: this.dependencyGraph,
      object_owners: this.objectOwners,
      unsafe_migrations: Object.entries(this.dependencyGraph)
        .filter(([_, deps]) => !deps.dependencies.satisfied || deps.risks.length > 0)
        .reduce((acc, [filename, deps]) => {
          acc[filename] = {
            category: deps.category,
            risks: deps.risks,
            unsatisfied_objects: deps.dependencies.unsatisfied_objects,
            unsafe_assumptions: deps.unsafe_assumptions,
          };
          return acc;
        }, {}),
      critical_issues: Object.entries(this.dependencyGraph)
        .filter(([_, deps]) => deps.risks.some(r => r.severity === 'critical'))
        .map(([filename, deps]) => ({
          migration: filename,
          risks: deps.risks.filter(r => r.severity === 'critical'),
        })),
    };

    const reportPath = path.join(outputDir, 'migration_dependency_graph.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✓ Generated: ${reportPath}`);

    // Generate text summary
    let summary = `Migration Dependency Analysis\n`;
    summary += `Generated: ${report.timestamp}\n`;
    summary += `Migrations: ${report.migration_count}\n\n`;

    summary += `CRITICAL DEPENDENCY ISSUES\n`;
    summary += `===========================\n`;
    report.critical_issues.forEach(issue => {
      summary += `\n${issue.migration}\n`;
      issue.risks.forEach(risk => {
        summary += `  [CRITICAL] ${risk.type}: ${risk.message || risk.object}\n`;
      });
    });

    summary += `\nUNSAFE MIGRATIONS (${Object.keys(report.unsafe_migrations).length})\n`;
    summary += `====================\n`;
    Object.entries(report.unsafe_migrations).slice(0, 20).forEach(([filename, info]) => {
      summary += `\n${filename} (${info.category})\n`;
      if (info.unsatisfied_objects.length > 0) {
        summary += `  Unsatisfied: ${info.unsatisfied_objects.map(u => u.object).join(', ')}\n`;
      }
      if (info.unsafe_assumptions.length > 0) {
        summary += `  Unsafe assumptions: ${info.unsafe_assumptions.map(u => u.object).join(', ')}\n`;
      }
    });

    const summaryPath = path.join(outputDir, 'migration_dependency_analysis.txt');
    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ Generated: ${summaryPath}`);

    return report;
  }

  run() {
    this.loadMigrations();
    this.buildObjectOwnerMap();
    this.buildDependencyGraph();
    this.detectUnsafePatterns();
    this.generateReport(OUTPUT_DIR);
  }
}

// Execute
const inference = new MigrationDependencyInference(MIGRATIONS_DIR);
inference.run();
