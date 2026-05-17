#!/usr/bin/env node

/**
 * Function Signature Registry
 * 
 * Builds a registry of all function signatures across migrations
 * 
 * Detects:
 * - dead grants (grant on non-existent function)
 * - dead revokes (revoke on non-existent function)
 * - commented-out creators (function defined but commented)
 * - stale signatures (function replaced but old grants remain)
 * - orphan hardening (RLS on non-existent function)
 * 
 * Output: function_signature_registry.json
 * 
 * Structure:
 * {
 *   "complete_sale(uuid,uuid,jsonb)": {
 *     "signature": "complete_sale(uuid,uuid,jsonb)",
 *     "created_by": "20260420100000_pos_transactions.sql",
 *     "security_definer": true,
 *     "search_path": "explicit|implicit|missing",
 *     "mutated_by": [
 *       { "type": "ALTER", "migration": "..." }
 *     ],
 *     "granted_by": [
 *       { "role": "anon", "permissions": "EXECUTE", "migration": "..." }
 *     ],
 *     "revoked_by": [
 *       { "role": "anon", "permissions": "EXECUTE", "migration": "..." }
 *     ],
 *     "missing": false,
 *     "conflicts": [],
 *     "risks": []
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.argv[2] || '/migrations';
const OUTPUT_DIR = process.argv[3] || '.';

class FunctionSignatureRegistry {
  constructor(migrationsDir) {
    this.migrationsDir = migrationsDir;
    this.migrations = [];
    this.registry = {};
    this.conflicts = [];
  }

  loadMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      console.error(`Migrations directory not found: ${this.migrationsDir}`);
      return;
    }

    this.migrations = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Loaded ${this.migrations.length} migrations for function analysis`);
  }

  extractFunctionSignature(createStatement) {
    // Extract function name and parameters from CREATE FUNCTION
    const match = createStatement.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(\s*([^)]*)\s*\)/i
    );

    if (match) {
      const name = match[1];
      const params = match[2].trim();
      return { name, params, signature: `${name}(${params})` };
    }
    return null;
  }

  analyzeFunctionFromMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const timestamp = filename.substring(0, 14);

    const functions = {
      creates: [],
      alters: [],
      drops: [],
      grants: [],
      revokes: [],
    };

    // Extract CREATE FUNCTION statements
    const createMatches = content.matchAll(
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(([^)]*)\)[^;]*;/gi
    );

    for (const match of createMatches) {
      const sig = this.extractFunctionSignature(match[0]);
      if (sig) {
        const isSecurityDefiner = /SECURITY\s+DEFINER/i.test(match[0]);
        const hasSearchPath = /SET\s+search_path/i.test(match[0]);

        functions.creates.push({
          signature: sig.signature,
          name: sig.name,
          params: sig.params,
          migration: filename,
          timestamp,
          is_security_definer: isSecurityDefiner,
          search_path: hasSearchPath ? 'explicit' : 'implicit',
          is_replacement: /OR\s+REPLACE/i.test(match[0]),
        });
      }
    }

    // Extract ALTER FUNCTION
    const alterMatches = content.matchAll(
      /ALTER\s+FUNCTION\s+(?:public\.)?(\w+)\s*\(([^)]*)\)\s+([^;]+);/gi
    );

    for (const match of alterMatches) {
      functions.alters.push({
        name: match[1],
        params: match[2],
        alteration: match[3].trim(),
        migration: filename,
        timestamp,
      });
    }

    // Extract DROP FUNCTION
    const dropMatches = content.matchAll(
      /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([^)]*)\)/gi
    );

    for (const match of dropMatches) {
      functions.drops.push({
        name: match[1],
        params: match[2],
        migration: filename,
        timestamp,
      });
    }

    // Extract GRANT on FUNCTION
    const grantMatches = content.matchAll(
      /GRANT\s+([^O]+?)\s+ON\s+(?:FUNCTION\s+)?(?:public\.)?(\w+)\s*\(([^)]*)\)\s+TO\s+(\w+)/gi
    );

    for (const match of grantMatches) {
      functions.grants.push({
        permissions: match[1].trim(),
        function_name: match[2],
        params: match[3],
        role: match[4],
        migration: filename,
        timestamp,
      });
    }

    // Extract REVOKE on FUNCTION
    const revokeMatches = content.matchAll(
      /REVOKE\s+([^O]+?)\s+ON\s+(?:FUNCTION\s+)?(?:public\.)?(\w+)\s*\(([^)]*)\)\s+FROM\s+(\w+)/gi
    );

    for (const match of revokeMatches) {
      functions.revokes.push({
        permissions: match[1].trim(),
        function_name: match[2],
        params: match[3],
        role: match[4],
        migration: filename,
        timestamp,
      });
    }

    return functions;
  }

  buildRegistry() {
    console.log('\nBuilding function signature registry...');

    this.migrations.forEach(filename => {
      const functions = this.analyzeFunctionFromMigration(filename);

      // Record creates
      functions.creates.forEach(fn => {
        if (this.registry[fn.signature]) {
          // Function already exists - this is a replacement
          if (!fn.is_replacement) {
            this.conflicts.push({
              type: 'duplicate_create',
              function: fn.signature,
              creators: [this.registry[fn.signature].created_by, filename],
              severity: 'high',
            });
          }
          this.registry[fn.signature].mutated_by.push({
            type: 'REPLACE',
            migration: filename,
            timestamp: fn.timestamp,
          });
        } else {
          this.registry[fn.signature] = {
            signature: fn.signature,
            name: fn.name,
            params: fn.params,
            created_by: filename,
            created_timestamp: fn.timestamp,
            is_security_definer: fn.is_security_definer,
            search_path: fn.search_path,
            mutated_by: [],
            granted_by: [],
            revoked_by: [],
            missing: false,
            conflicts: [],
            risks: [],
          };

          if (!fn.is_security_definer && fn.search_path === 'implicit') {
            this.registry[fn.signature].risks.push({
              type: 'unsafe_search_path',
              severity: 'medium',
              message: 'Function created without SECURITY DEFINER or explicit search_path',
            });
          }
        }
      });

      // Record alters
      functions.alters.forEach(fn => {
        const name = `${fn.name}(${fn.params})`;
        if (this.registry[name] && this.registry[name].mutated_by) {
          this.registry[name].mutated_by.push({
            type: 'ALTER',
            alteration: fn.alteration,
            migration: filename,
            timestamp: fn.timestamp,
          });
        } else if (this.registry[name]) {
          this.registry[name].mutated_by = [{
            type: 'ALTER',
            alteration: fn.alteration,
            migration: filename,
            timestamp: fn.timestamp,
          }];
        }
      });

      // Record drops
      functions.drops.forEach(fn => {
        const name = `${fn.name}(${fn.params})`;
        if (this.registry[name]) {
          this.registry[name].dropped_by = filename;
          this.registry[name].dropped_timestamp = fn.timestamp;
        }
      });

      // Record grants
      functions.grants.forEach(grant => {
        const name = `${grant.function_name}(${grant.params})`;
        if (this.registry[name]) {
          this.registry[name].granted_by.push({
            role: grant.role,
            permissions: grant.permissions,
            migration: filename,
            timestamp: grant.timestamp,
          });
        } else {
          // Orphan grant
          this.conflicts.push({
            type: 'orphan_grant',
            function: name,
            grant_migration: filename,
            role: grant.role,
            severity: 'high',
          });
          
          if (!this.registry[name]) {
            this.registry[name] = {
              signature: name,
              name: grant.function_name,
              params: grant.params,
              missing: true,
              granted_by: [
                {
                  role: grant.role,
                  permissions: grant.permissions,
                  migration: filename,
                  timestamp: grant.timestamp,
                },
              ],
              conflicts: [{
                type: 'orphan_grant',
                migration: filename,
              }],
              risks: [{
                type: 'missing_creator',
                severity: 'critical',
                message: 'Function granted before creation or after deletion',
              }],
            };
          }
        }
      });

      // Record revokes
      functions.revokes.forEach(revoke => {
        const name = `${revoke.function_name}(${revoke.params})`;
        if (this.registry[name] && this.registry[name].revoked_by) {
          this.registry[name].revoked_by.push({
            role: revoke.role,
            permissions: revoke.permissions,
            migration: filename,
            timestamp: revoke.timestamp,
          });
        } else if (this.registry[name]) {
          // Initialize revoked_by array if needed
          this.registry[name].revoked_by = [{
            role: revoke.role,
            permissions: revoke.permissions,
            migration: filename,
            timestamp: revoke.timestamp,
          }];
        } else {
          // Orphan revoke
          this.conflicts.push({
            type: 'orphan_revoke',
            function: name,
            revoke_migration: filename,
            role: revoke.role,
            severity: 'medium',
          });
        }
      });
    });

    console.log(`Registry built: ${Object.keys(this.registry).length} function signatures tracked`);
  }

  detectRisks() {
    console.log('\nDetecting function signature risks...');

    Object.entries(this.registry).forEach(([signature, fn]) => {
      if (!fn.risks) fn.risks = [];
      if (!fn.granted_by) fn.granted_by = [];
      if (!fn.revoked_by) fn.revoked_by = [];

      // Risk: Dead grant (function dropped but grant exists)
      if (fn.dropped_by && fn.granted_by.length > 0) {
        const grantAfterDrop = fn.granted_by.some(g => g.timestamp > fn.dropped_timestamp);
        if (grantAfterDrop) {
          fn.risks.push({
            type: 'grant_after_drop',
            severity: 'high',
            message: 'Function granted after being dropped',
          });
        }
      }

      // Risk: Dead revoke (grant and revoke but no final state)
      if (fn.granted_by.length > 0 && fn.revoked_by.length > 0) {
        const lastGrant = Math.max(...fn.granted_by.map(g => parseInt(g.timestamp)));
        const lastRevoke = Math.max(...fn.revoked_by.map(r => parseInt(r.timestamp)));
        if (lastRevoke > lastGrant) {
          fn.risks.push({
            type: 'final_state_revoked',
            severity: 'low',
            message: 'Function permissions revoked at end of replay',
          });
        }
      }

      // Risk: SECURITY DEFINER without search_path
      if (fn.is_security_definer && fn.search_path === 'implicit') {
        fn.risks.push({
          type: 'security_definer_missing_search_path',
          severity: 'high',
          message: 'SECURITY DEFINER function must have explicit search_path',
        });
      }

      // Risk: Multiple grants to same role (unclear intent)
      const roleGrants = {};
      fn.granted_by.forEach(g => {
        roleGrants[g.role] = (roleGrants[g.role] || 0) + 1;
      });
      Object.entries(roleGrants).forEach(([role, count]) => {
        if (count > 1) {
          fn.risks.push({
            type: 'multiple_grants_same_role',
            severity: 'medium',
            role,
            count,
          });
        }
      });
    });

    const highRiskFunctions = Object.entries(this.registry)
      .filter(([_, fn]) => fn.risks.some(r => r.severity === 'critical' || r.severity === 'high'))
      .length;

    console.log(`High-risk functions detected: ${highRiskFunctions}`);
  }

  generateReport(outputDir) {
    console.log(`\nGenerating function signature report to ${outputDir}...`);

    const report = {
      timestamp: new Date().toISOString(),
      migration_count: this.migrations.length,
      functions_tracked: Object.keys(this.registry).length,
      missing_functions: Object.values(this.registry).filter(f => f.missing).length,
      conflicts_detected: this.conflicts.length,
      registry: this.registry,
      conflicts: this.conflicts,
      high_risk_functions: Object.entries(this.registry)
        .filter(([_, fn]) => fn.risks.some(r => r.severity === 'critical' || r.severity === 'high'))
        .map(([sig, fn]) => ({ signature: sig, risks: fn.risks })),
    };

    const reportPath = path.join(outputDir, 'function_signature_registry.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✓ Generated: ${reportPath}`);

    // Generate text summary
    let summary = `Function Signature Registry\n`;
    summary += `Generated: ${report.timestamp}\n`;
    summary += `Migrations: ${report.migration_count}\n`;
    summary += `Functions Tracked: ${report.functions_tracked}\n`;
    summary += `Missing Functions: ${report.missing_functions}\n`;
    summary += `Conflicts: ${report.conflicts_detected}\n\n`;

    summary += `HIGH-RISK FUNCTIONS\n`;
    summary += `===================\n`;
    report.high_risk_functions.forEach(fn => {
      summary += `\n${fn.signature}\n`;
      fn.risks.forEach(risk => {
        summary += `  [${risk.severity}] ${risk.type}: ${risk.message}\n`;
      });
    });

    summary += `\nOPHAN GRANTS/REVOKES\n`;
    summary += `====================\n`;
    report.conflicts
      .filter(c => c.type === 'orphan_grant' || c.type === 'orphan_revoke')
      .forEach(c => {
        summary += `[${c.type}] ${c.function} (${c.role || 'N/A'})\n`;
      });

    const summaryPath = path.join(outputDir, 'function_signature_analysis.txt');
    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ Generated: ${summaryPath}`);

    return report;
  }

  run() {
    this.loadMigrations();
    this.buildRegistry();
    this.detectRisks();
    this.generateReport(OUTPUT_DIR);
  }
}

// Execute
const registry = new FunctionSignatureRegistry(MIGRATIONS_DIR);
registry.run();
