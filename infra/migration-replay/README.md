# Migration Replay Infrastructure

Deterministic Docker-based migration replay verification system for LuckyStorePOS.

## Purpose

This system transforms migration replay from "fragile historical drift" into "deterministic infrastructure verification."

Responsibilities:
- **Docker**: Deterministic replay execution, isolated Postgres boot, reproducible migration ordering, structural diff generation
- **AI**: Diagnose replay failures, propose safe deterministic patches, classify migration drift, identify canonical conflicts

## Architecture

```
replay-postgres (isolated Postgres 15 container)
    ↓
replay-engine (Dockerfile with migration replay scripts)
    ├→ replay.sh (deterministic iteration, failure capture)
    ├→ extract_failure.sh (error context extraction)
    ├→ schema_snapshot.sh (before/after capture)
    ├→ compare_schema.sh (drift detection)
    ├→ classify_migrations.cjs (migration analysis)
    └→ replay_report.cjs (artifact aggregation)
```

## Quick Start

### Local Replay

```bash
# Navigate to infra/migration-replay
cd infra/migration-replay

# Run complete replay with Docker Compose
docker-compose up --build

# View artifacts
ls -la ../../artifacts/
cat ../../artifacts/replay-report.md
```

### Single Migration Test

```bash
# Test a specific migration
docker-compose run replay-engine \
  /replay-scripts/replay_single.sh /migrations/20260301000000_baseline_core_tables.sql
```

### Replay Diagnostics

```bash
# View failure details
cat artifacts/failure.json

# View schema drift
cat artifacts/drift-report.json

# View migration classification
cat artifacts/migration-graph.json

# View complete report
cat artifacts/replay-report.md
```

## Artifact Generation

The replay system generates:

### Mandatory Outputs
- `replay-report.json` - Machine-readable replay metrics and recommendations
- `replay-report.md` - Human-readable summary
- `failure.json` - Structured failure context (if replay fails)
- `migration-graph.json` - Classification and risk analysis

### Schema Snapshots
- `schema-baseline.sql` - Initial state (empty schema)
- `schema-after.sql` - Final state after replay
- `diff-report.txt` - Line-by-line diff

### Detailed Analysis
- `drift-report.json` - Object counts and drift indicators
- `migration-classification.txt` - Human-readable classification summary
- `replay.log` - Full execution log
- `replay-errors.log` - Error output only

## Migration Classification

Migrations are categorized into:

1. **foundational** - Core tables, ownership, baseline structures
2. **extension** - Extension load, configuration
3. **runtime-only** - Runtime RPCs, temporary objects
4. **hardening** - Security policies, RLS, grants
5. **replacement** - Migration that replaces prior object
6. **dead/replaced** - No longer used, superseded
7. **unsafe-replay** - Cannot replay safely, idempotency issues

### Risk Scoring

- **Critical**: Foundational objects without guards, unsafe replay patterns
- **High**: Hardening without explicit dependencies, non-idempotent operations
- **Medium**: Complex mutations, dangling hardening
- **Low**: Standard runtime migrations

## Determinism Verification

The system verifies determinism by:

1. Recording first replay schema
2. Dropping and replaying migrations
3. Recording second replay schema
4. Comparing byte-for-byte equality

Deterministic ✓ = identical schemas across replays

## CI/CD Integration

See `.github/workflows/migration-replay.yml`

Runs automatically on:
- Push to main/develop (when migrations change)
- Pull requests to main/develop
- Manual trigger via workflow_dispatch

Pipeline:
1. Boot isolated Postgres
2. Iterate migrations deterministically
3. Capture failure context immediately on error
4. Generate schema snapshots
5. Detect drift and structural changes
6. Classify migrations and score risks
7. Generate comprehensive report

## Safety Rules

### Never
- Reorder migrations automatically
- Rewrite foundational ownership
- Invent canonical schemas
- Create compatibility aliases
- Bypass replay failures
- Comment out migrations silently
- Mutate production environments

### Preserve
- Canonical schema integrity
- Immutable ledger assumptions
- RPC contract correctness
- Replay determinism
- Migration ordering semantics

## Repair Workflow

For replay failures:

1. **Extract failure context** → `failure.json`
2. **Diagnose root cause** → Check classification and patterns
3. **Propose deterministic repair** → Add IF EXISTS / IF NOT EXISTS guards
4. **Validate locally** → Run single migration test
5. **Verify determinism** → Run full replay twice
6. **Merge and CI** → CI validates across full replay

## Dangerous Patterns

The classifier detects:

```sql
-- DANGEROUS: No IF EXISTS guard
DROP TABLE users;

-- DANGEROUS: Non-idempotent operation
CREATE FUNCTION process_inventory() ...

-- DANGEROUS: Hardening without owner
CREATE POLICY check_auth ON orders ...

-- DANGEROUS: Assumes search_path
SELECT create_function_in_assumed_schema();
```

## Safe Patterns

```sql
-- SAFE: Guarded DROP
DROP TABLE IF EXISTS users CASCADE;

-- SAFE: Guarded CREATE
CREATE TABLE IF NOT EXISTS users (...);

-- SAFE: Explicit function handling
DROP FUNCTION IF EXISTS process_inventory CASCADE;
CREATE OR REPLACE FUNCTION process_inventory() ...;

-- SAFE: Explicit search_path
CREATE FUNCTION process_inventory() 
  SET search_path = public
  LANGUAGE sql ...;
```

## Troubleshooting

### Replay fails at migration X

1. Check `failure.json` for exact error
2. Verify migration is idempotent (has IF EXISTS guards)
3. Check for dependency on later migrations
4. Run `replay_single.sh` for detailed diagnostics

### Schema drift detected

1. Check `drift-report.json` for object counts
2. Review `diff-report.txt` for changes
3. Look for orphaned objects or duplicate creates
4. Check `migration-graph.json` for replacement conflicts

### Non-deterministic replay

1. Run determinism check: replay twice
2. Compare `schema-baseline.sql` vs both runs
3. Look for random elements (UUIDs, timestamps)
4. Check for migrations with side effects

## Future Enhancements

- [ ] Multi-database replay (validate across versions)
- [ ] Capability assertion framework
- [ ] Replay optimization (parallel non-dependent migrations)
- [ ] Schema collapse planning (baseline migration extraction)
- [ ] Offline sync validation against replay outputs
- [ ] Reconciliation determinism verification

## Links

- [AGENTS.md](../../AGENTS.md) - Agent responsibilities
- [AI_TASKS.md](../../AI_TASKS.md) - Task descriptions
- Migrations: [supabase/migrations](../../supabase/migrations/)
- Test RPCs: [supabase/rpc/](../../supabase/rpc/)
