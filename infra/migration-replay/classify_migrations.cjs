#!/usr/bin/env node

/**
 * Classify migrations into determinism categories
 * 
 * Categories:
 * 1. foundational - core tables, ownership, baseline structures
 * 2. extension - extension load, configuration
 * 3. runtime-only - runtime RPCs, temporary objects
 * 4. hardening - security policies, RLS, grants
 * 5. replacement - migration that replaces prior object
 * 6. dead/replaced - no longer used, superseded
 * 7. unsafe-replay - cannot replay safely, idempotency issues
 * 
 * Classification metrics:
 * - filename analysis (timestamp, naming conventions)
 * - SQL pattern analysis (CREATE, ALTER, DROP, IF EXISTS)
 * - dependency inference (migration ordering dependencies)
 * - replay risk scoring (determinism indicators)
 * 
 * Output: migration-graph.json with:
 * - classification mapping
 * - dependency graph
 * - replay risks
 * - canonical ownership findings
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.argv[2] || '/migrations';
const OUTPUT_DIR = process.argv[3] || '.';

// Migration classification rules
const FOUNDATIONAL_PATTERNS = [
  /baseline_core_tables/,
  /schema|table|column/i,
];

const EXTENSION_PATTERNS = [
  /extension|pgroonga|pgaudit/i,
];

const RUNTIME_ONLY_PATTERNS = [
  /rpc|function|procedure/i,
  /materialized_view|refresh/i,
];

const HARDENING_PATTERNS = [
  /security|rls|policy|grant|revoke|permission/i,
  /hardening|audit|logging/i,
];

const REPLACEMENT_PATTERNS = [
  /fix_|repair_|replace_/i,
];

const DEAD_PATTERNS = [
  /deprecated|remove_|delete_/i,
];

const UNSAFE_PATTERNS = [
  /-- migration_skip/i,
  /TRUNCATE/i,
  /DROP TABLE(?!\s+IF EXISTS)/i,
];

class MigrationClassifier {
  constructor(migrationsDir) {
    this.migrationsDir = migrationsDir;
    this.migrations = [];
    this.classifications = {};
    this.dependencies = {};
    this.risks = {};
  }

  loadMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      console.error(`Migrations directory not found: ${this.migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    this.migrations = files;
    console.log(`Loaded ${this.migrations.length} migrations`);
  }

  classifyMigration(filename) {
    const content = fs.readFileSync(
      path.join(this.migrationsDir, filename),
      'utf-8'
    );

    const classifications = [];
    let riskLevel = 'low';

    // Check patterns in order of priority
    if (FOUNDATIONAL_PATTERNS.some(p => p.test(filename) || p.test(content))) {
      classifications.push('foundational');
      riskLevel = 'critical';
    }

    if (EXTENSION_PATTERNS.some(p => p.test(filename) || p.test(content))) {
      classifications.push('extension');
    }

    if (RUNTIME_ONLY_PATTERNS.some(p => p.test(filename) || p.test(content))) {
      classifications.push('runtime-only');
    }

    if (HARDENING_PATTERNS.some(p => p.test(filename) || p.test(content))) {
      classifications.push('hardening');
      riskLevel = 'high';
    }

    if (REPLACEMENT_PATTERNS.some(p => p.test(filename))) {
      classifications.push('replacement');
      riskLevel = 'medium';
    }

    if (DEAD_PATTERNS.some(p => p.test(filename))) {
      classifications.push('dead');
      riskLevel = 'info';
    }

    // Check for unsafe replay patterns
    const hasUnsafePatterns = UNSAFE_PATTERNS.some(p => p.test(content));
    if (hasUnsafePatterns) {
      classifications.push('unsafe-replay');
      riskLevel = 'critical';
    }

    // Idempotency check (IF EXISTS / IF NOT EXISTS)
    const hasIfExists = /IF\s+(?:NOT\s+)?EXISTS/i.test(content);
    const isIdempotent = hasIfExists || !/(DROP|DELETE|TRUNCATE)/i.test(content);

    return {
      filename,
      classifications: classifications.length > 0 ? classifications : ['uncategorized'],
      riskLevel,
      isIdempotent,
      hasUnsafePatterns,
      hasIfExists,
      lineCount: content.split('\n').length,
      createCount: (content.match(/CREATE\s+/gi) || []).length,
      alterCount: (content.match(/ALTER\s+/gi) || []).length,
      dropCount: (content.match(/DROP\s+/gi) || []).length,
    };
  }

  analyzeAll() {
    console.log('\nClassifying migrations...');
    
    this.migrations.forEach(filename => {
      const classification = this.classifyMigration(filename);
      this.classifications[filename] = classification;

      // Log critical and high-risk migrations
      if (['critical', 'high'].includes(classification.riskLevel)) {
        console.log(`  [${classification.riskLevel.toUpperCase()}] ${filename}`);
        console.log(`    - ${classification.classifications.join(', ')}`);
        if (classification.hasUnsafePatterns) {
          console.log(`    - ⚠️  UNSAFE REPLAY PATTERNS DETECTED`);
        }
        if (!classification.isIdempotent) {
          console.log(`    - ⚠️  NOT IDEMPOTENT (no IF EXISTS guards)`);
        }
      }
    });
  }

  buildDependencyGraph() {
    console.log('\nBuilding migration dependency graph...');

    // Simple dependency inference:
    // - Hardening migrations depend on foundational migrations
    // - Runtime migrations depend on foundational migrations
    // - Replacement migrations depend on their target

    const deps = {};
    const foundational = [];

    // Identify foundational migrations
    Object.entries(this.classifications).forEach(([filename, classification]) => {
      if (classification.classifications.includes('foundational')) {
        foundational.push(filename);
      }
    });

    // Build graph
    Object.entries(this.classifications).forEach(([filename, classification]) => {
      const dependencies = [];

      if (classification.classifications.includes('hardening')) {
        // Hardening depends on foundational
        dependencies.push(...foundational);
      }

      if (classification.classifications.includes('runtime-only')) {
        // Runtime depends on foundational + extensions
        dependencies.push(...foundational);
      }

      if (classification.classifications.includes('replacement')) {
        // Try to infer replaced target from filename
        const target = filename.replace(/^.*fix_|^.*repair_/, '');
        const matches = this.migrations.filter(m => m.includes(target) && m !== filename);
        dependencies.push(...matches);
      }

      deps[filename] = dependencies;
    });

    this.dependencies = deps;
  }

  detectDriftRisks() {
    console.log('\nDetecting replay drift risks...');

    const risks = {};

    Object.entries(this.classifications).forEach(([filename, classification]) => {
      const fileRisks = [];

      // Risk 1: Unsafe replay patterns
      if (classification.hasUnsafePatterns) {
        fileRisks.push({
          type: 'unsafe-replay-pattern',
          severity: 'critical',
          message: 'Migration contains DROP/TRUNCATE without IF EXISTS guards',
        });
      }

      // Risk 2: Non-idempotent operations
      if (!classification.isIdempotent) {
        fileRisks.push({
          type: 'non-idempotent',
          severity: 'high',
          message: 'Migration cannot safely replay - missing IF EXISTS guards',
        });
      }

      // Risk 3: Foundational objects without IF NOT EXISTS
      if (classification.classifications.includes('foundational') && !classification.hasIfExists) {
        fileRisks.push({
          type: 'foundational-no-guards',
          severity: 'high',
          message: 'Foundational objects lack IF NOT EXISTS protection',
        });
      }

      // Risk 4: Hardening before owner objects
      if (classification.classifications.includes('hardening')) {
        const dependencies = this.dependencies[filename] || [];
        if (dependencies.length === 0) {
          fileRisks.push({
            type: 'dangling-hardening',
            severity: 'medium',
            message: 'Hardening migration has no explicit dependencies - may run before owner objects',
          });
        }
      }

      // Risk 5: Multiple DROP/ALTER operations
      if (classification.dropCount > 2 || classification.alterCount > 5) {
        fileRisks.push({
          type: 'complex-mutations',
          severity: 'medium',
          message: `High mutation count: ${classification.dropCount} DROPs, ${classification.alterCount} ALTERs`,
        });
      }

      if (fileRisks.length > 0) {
        risks[filename] = fileRisks;
      }
    });

    this.risks = risks;
  }

  generateReport(outputDir) {
    console.log(`\nGenerating reports to ${outputDir}...`);

    const report = {
      timestamp: new Date().toISOString(),
      migrations_analyzed: this.migrations.length,
      classification_summary: {
        foundational: Object.values(this.classifications)
          .filter(c => c.classifications.includes('foundational')).length,
        extension: Object.values(this.classifications)
          .filter(c => c.classifications.includes('extension')).length,
        runtime_only: Object.values(this.classifications)
          .filter(c => c.classifications.includes('runtime-only')).length,
        hardening: Object.values(this.classifications)
          .filter(c => c.classifications.includes('hardening')).length,
        replacement: Object.values(this.classifications)
          .filter(c => c.classifications.includes('replacement')).length,
        dead: Object.values(this.classifications)
          .filter(c => c.classifications.includes('dead')).length,
        unsafe_replay: Object.values(this.classifications)
          .filter(c => c.classifications.includes('unsafe-replay')).length,
      },
      risk_summary: {
        critical: Object.values(this.classifications)
          .filter(c => c.riskLevel === 'critical').length,
        high: Object.values(this.classifications)
          .filter(c => c.riskLevel === 'high').length,
        medium: Object.values(this.classifications)
          .filter(c => c.riskLevel === 'medium').length,
        low: Object.values(this.classifications)
          .filter(c => c.riskLevel === 'low').length,
      },
      migrations_with_risks: Object.keys(this.risks).length,
      classifications: this.classifications,
      dependencies: this.dependencies,
      risks: this.risks,
    };

    const reportPath = path.join(outputDir, 'migration-graph.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✓ Generated: ${reportPath}`);

    // Generate text summary
    const summary = this.generateTextSummary(report);
    const summaryPath = path.join(outputDir, 'migration-classification.txt');
    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ Generated: ${summaryPath}`);

    return report;
  }

  generateTextSummary(report) {
    let text = `Migration Classification Report\n`;
    text += `Generated: ${report.timestamp}\n`;
    text += `Migrations Analyzed: ${report.migrations_analyzed}\n\n`;

    text += `CLASSIFICATION SUMMARY\n`;
    text += `======================\n`;
    Object.entries(report.classification_summary).forEach(([key, count]) => {
      text += `${key.replace(/_/g, ' ').toUpperCase()}: ${count}\n`;
    });

    text += `\nRISK SUMMARY\n`;
    text += `============\n`;
    Object.entries(report.risk_summary).forEach(([key, count]) => {
      text += `${key.toUpperCase()}: ${count}\n`;
    });

    text += `\nMIGRATIONS WITH RISKS (${report.migrations_with_risks})\n`;
    text += `=====================\n`;
    Object.entries(report.risks).forEach(([filename, risks]) => {
      text += `\n${filename}\n`;
      risks.forEach(risk => {
        text += `  [${risk.severity}] ${risk.type}: ${risk.message}\n`;
      });
    });

    return text;
  }

  run() {
    this.loadMigrations();
    this.analyzeAll();
    this.buildDependencyGraph();
    this.detectDriftRisks();
    this.generateReport(OUTPUT_DIR);
  }
}

// Execute
const classifier = new MigrationClassifier(MIGRATIONS_DIR);
classifier.run();
