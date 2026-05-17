#!/usr/bin/env node

/**
 * Generate comprehensive replay report
 * 
 * Combines:
 * - replay metrics (timing, pass/fail counts)
 * - failure information
 * - drift analysis
 * - migration classification insights
 * - repair recommendations
 * 
 * Output format:
 * - replay-report.json (machine-readable)
 * - replay-report.md (human-readable markdown)
 * 
 * Purpose:
 * Support AI diagnosis and convergence loop
 */

const fs = require('fs');
const path = require('path');

const REPLAY_START = process.argv[2] || new Date().toISOString();
const REPLAY_END = process.argv[3] || new Date().toISOString();
const REPLAY_DURATION_MS = parseInt(process.argv[4]) || 0;
const MIGRATION_COUNT = parseInt(process.argv[5]) || 0;
const MIGRATION_PASSED = parseInt(process.argv[6]) || 0;
const OUTPUT_DIR = process.argv[7] || '.';

class ReplayReporter {
  constructor() {
    this.artifacts = {
      failure: null,
      driftReport: null,
      migrationGraph: null,
    };
    this.loadArtifacts();
  }

  loadArtifacts() {
    // Try to load failure info
    const failurePath = path.join(OUTPUT_DIR, 'failure.json');
    if (fs.existsSync(failurePath)) {
      this.artifacts.failure = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));
    }

    // Try to load drift report
    const driftPath = path.join(OUTPUT_DIR, 'drift-report.json');
    if (fs.existsSync(driftPath)) {
      this.artifacts.driftReport = JSON.parse(fs.readFileSync(driftPath, 'utf-8'));
    }

    // Try to load migration graph
    const graphPath = path.join(OUTPUT_DIR, 'migration-graph.json');
    if (fs.existsSync(graphPath)) {
      this.artifacts.migrationGraph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }
  }

  generateJsonReport() {
    const success = MIGRATION_PASSED === MIGRATION_COUNT;
    const migrationsFailed = MIGRATION_COUNT - MIGRATION_PASSED;

    return {
      timestamp: new Date().toISOString(),
      replay_session: {
        start: REPLAY_START,
        end: REPLAY_END,
        duration_ms: REPLAY_DURATION_MS,
        total_migrations: MIGRATION_COUNT,
        migrations_passed: MIGRATION_PASSED,
        migrations_failed: migrationsFailed,
        success,
      },
      failure: this.artifacts.failure || null,
      drift: this.artifacts.driftReport || null,
      migration_analysis: this.artifacts.migrationGraph ? {
        total_analyzed: this.artifacts.migrationGraph.migrations_analyzed,
        classifications: this.artifacts.migrationGraph.classification_summary,
        risk_summary: this.artifacts.migrationGraph.risk_summary,
        migrations_with_risks: this.artifacts.migrationGraph.migrations_with_risks,
      } : null,
      determinism_verdict: {
        is_deterministic: success && !this.artifacts.driftReport?.drift_indicators?.duplicate_creates,
        has_drift: this.artifacts.driftReport ? this.artifacts.driftReport.changes.total_lines > 0 : false,
        has_unsafe_patterns: this.artifacts.migrationGraph ?
          this.artifacts.migrationGraph.classification_summary.unsafe_replay > 0 : false,
      },
      repair_recommendations: this.generateRepairRecommendations(),
    };
  }

  generateRepairRecommendations() {
    const recommendations = [];

    // If failed, prioritize the failure
    if (MIGRATION_PASSED < MIGRATION_COUNT) {
      const failure = this.artifacts.failure;
      if (failure) {
        recommendations.push({
          priority: 'critical',
          category: 'replay-failure',
          message: `Migration ${failure.migration} failed at line ${failure.line}`,
          action: 'Review failure.json for SQL context and error details. Apply deterministic guard (IF EXISTS/IF NOT EXISTS).',
          details: {
            migration: failure.migration,
            error: failure.error,
            classification: failure.classification,
          },
        });
      }
    }

    // Unsafe replay patterns
    if (this.artifacts.migrationGraph?.classification_summary?.unsafe_replay > 0) {
      recommendations.push({
        priority: 'high',
        category: 'unsafe-replay-patterns',
        message: `${this.artifacts.migrationGraph.classification_summary.unsafe_replay} migrations have unsafe replay patterns`,
        action: 'Add IF EXISTS guards to DROP statements. Wrap non-idempotent operations with idempotency checks.',
        details: this.artifacts.migrationGraph.risks,
      });
    }

    // Drift indicators
    if (this.artifacts.driftReport?.drift_indicators?.duplicate_creates > 0) {
      recommendations.push({
        priority: 'high',
        category: 'duplicate-creates',
        message: 'Schema contains duplicate CREATE statements',
        action: 'Use CREATE IF NOT EXISTS instead of CREATE. Remove duplicate definitions.',
      });
    }

    if (this.artifacts.driftReport?.drift_indicators?.search_path_assumptions > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'search-path-assumptions',
        message: 'Schema contains search_path assumptions',
        action: 'Make search_path explicit or remove assumptions. Ensure consistent across environments.',
      });
    }

    // Canonical conflicts
    if (this.artifacts.migrationGraph?.classification_summary?.replacement > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'canonical-conflicts',
        message: `${this.artifacts.migrationGraph.classification_summary.replacement} replacement migrations detected`,
        action: 'Verify replacement migrations include proper cleanup. Ensure no orphaned objects.',
      });
    }

    // Dangling hardening
    if (this.artifacts.migrationGraph?.risks) {
      const danglingHardening = Object.values(this.artifacts.migrationGraph.risks)
        .flat()
        .filter(r => r.type === 'dangling-hardening');

      if (danglingHardening.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'dangling-hardening',
          message: `${danglingHardening.length} hardening migrations lack dependencies`,
          action: 'Add explicit dependencies on foundational migrations. Ensure order of execution.',
        });
      }
    }

    return recommendations;
  }

  generateMarkdownReport() {
    let md = `# Migration Replay Report\n\n`;
    md += `**Generated**: ${new Date().toISOString()}\n\n`;

    // Session info
    md += `## Replay Session\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Start | ${REPLAY_START} |\n`;
    md += `| End | ${REPLAY_END} |\n`;
    md += `| Duration | ${REPLAY_DURATION_MS}ms |\n`;
    md += `| Total Migrations | ${MIGRATION_COUNT} |\n`;
    md += `| Passed | ${MIGRATION_PASSED} |\n`;
    md += `| Failed | ${MIGRATION_COUNT - MIGRATION_PASSED} |\n`;
    md += `| Success Rate | ${((MIGRATION_PASSED / MIGRATION_COUNT) * 100).toFixed(1)}% |\n\n`;

    // Determinism verdict
    md += `## Determinism Verdict\n\n`;
    const isSuccessful = MIGRATION_PASSED === MIGRATION_COUNT;
    const status = isSuccessful ? '✓ PASS' : '✗ FAIL';
    md += `**${status}** - Replay is ${isSuccessful ? 'deterministic and reproducible' : 'NOT deterministic'}\n\n`;

    // Failure details
    if (this.artifacts.failure) {
      md += `## Failure Details\n\n`;
      const f = this.artifacts.failure;
      md += `**Migration**: ${f.migration}\n\n`;
      md += `**Error Code**: ${f.error}\n\n`;
      md += `**Error Message**: \`\`\`\n${f.error}\n\`\`\`\n\n`;
      md += `**SQL Context** (line ${f.line}):\n\`\`\`sql\n${f.sql}\n\`\`\`\n\n`;
    }

    // Drift analysis
    if (this.artifacts.driftReport) {
      md += `## Schema Drift Analysis\n\n`;
      const d = this.artifacts.driftReport;
      md += `**Total Changes**: ${d.changes.total_lines} lines\n`;
      md += `- Added: ${d.changes.added}\n`;
      md += `- Removed: ${d.changes.removed}\n\n`;

      md += `**Schema Objects**:\n`;
      md += `- Tables: ${d.schema_objects.tables.baseline} → ${d.schema_objects.tables.final} (${d.schema_objects.tables.delta > 0 ? '+' : ''}${d.schema_objects.tables.delta})\n`;
      md += `- Functions: ${d.schema_objects.functions.baseline} → ${d.schema_objects.functions.final} (${d.schema_objects.functions.delta > 0 ? '+' : ''}${d.schema_objects.functions.delta})\n`;
      md += `- RLS Policies: ${d.schema_objects.rls_policies.baseline} → ${d.schema_objects.rls_policies.final} (${d.schema_objects.rls_policies.delta > 0 ? '+' : ''}${d.schema_objects.rls_policies.delta})\n\n`;

      md += `**Drift Indicators**:\n`;
      md += `- Duplicate CREATEs: ${d.drift_indicators.duplicate_creates > 0 ? '⚠️ YES' : '✓ None'}\n`;
      md += `- Unsafe Comments: ${d.drift_indicators.unsafe_comments > 0 ? '⚠️ YES' : '✓ None'}\n`;
      md += `- Search Path Assumptions: ${d.drift_indicators.search_path_assumptions > 0 ? '⚠️ YES' : '✓ None'}\n\n`;
    }

    // Migration analysis
    if (this.artifacts.migrationGraph) {
      md += `## Migration Classification\n\n`;
      const mg = this.artifacts.migrationGraph;
      md += `**Classifications**:\n`;
      md += `- Foundational: ${mg.classification_summary.foundational}\n`;
      md += `- Extension: ${mg.classification_summary.extension}\n`;
      md += `- Runtime-only: ${mg.classification_summary.runtime_only}\n`;
      md += `- Hardening: ${mg.classification_summary.hardening}\n`;
      md += `- Replacement: ${mg.classification_summary.replacement}\n`;
      md += `- Dead/Replaced: ${mg.classification_summary.dead}\n`;
      md += `- Unsafe Replay: ${mg.classification_summary.unsafe_replay}\n\n`;

      md += `**Risk Summary**:\n`;
      md += `- Critical: ${mg.risk_summary.critical}\n`;
      md += `- High: ${mg.risk_summary.high}\n`;
      md += `- Medium: ${mg.risk_summary.medium}\n`;
      md += `- Low: ${mg.risk_summary.low}\n\n`;

      if (mg.migrations_with_risks > 0) {
        md += `**Migrations with Detected Risks**: ${mg.migrations_with_risks}\n\n`;
      }
    }

    // Repair recommendations
    const recommendations = this.generateRepairRecommendations();
    if (recommendations.length > 0) {
      md += `## Repair Recommendations\n\n`;
      recommendations.forEach(rec => {
        md += `### ${rec.message}\n\n`;
        md += `**Priority**: ${rec.priority.toUpperCase()}\n\n`;
        md += `**Action**: ${rec.action}\n\n`;
      });
    }

    return md;
  }

  writeReports() {
    const jsonReport = this.generateJsonReport();
    const jsonPath = path.join(OUTPUT_DIR, 'replay-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✓ Generated: ${jsonPath}`);

    const mdReport = this.generateMarkdownReport();
    const mdPath = path.join(OUTPUT_DIR, 'replay-report.md');
    fs.writeFileSync(mdPath, mdReport);
    console.log(`✓ Generated: ${mdPath}`);
  }
}

// Execute
const reporter = new ReplayReporter();
reporter.writeReports();
