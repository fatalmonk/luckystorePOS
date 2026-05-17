# LuckyStorePOS Migration Replay Architecture

## Replay Engine

**Location**: `infra/migration-replay/`
**Entry point**: `replay.sh`
**Mode**: Bash + Node.js hybrid

## Replay Flow

```
verify_postgres_connectivity()
  -> generate_baseline_schema() [pg_dump --schema-only]
  -> replay_migrations() [deterministic filename sort]
    -> for each .sql: psql -v ON_ERROR_STOP=1 -f $file
    -> capture: line number, failing SQL, stderr
    -> write_failure_json() on error
  -> generate_final_schema() [pg_dump --schema-only]
  -> replay_report.cjs [generate report]
  -> build_ownership_graph.cjs [table ownership]
  -> build_function_registry.cjs [RPC signatures]
  -> build_migration_dependencies.cjs [dependency graph]
```

## Determinism Guarantees

1. **Filename ordering**: `find ... -print0 | sort -z` (lexicographic = chronological for timestamp prefix)
2. **ON_ERROR_STOP=1**: Immediate halt on any SQL error
3. **Baseline + final schema snapshots**: Before/after comparison possible
4. **Timing metrics**: Per-migration and total duration captured
5. **Machine-readable artifacts**: `failure.json` with structured failure context

## Artifact Outputs

| Artifact | Producer | Content |
|---|---|---|
| `replay.log` | `replay.sh` | Human-readable replay trace |
| `replay-errors.log` | `replay.sh` | stderr capture |
| `failure.json` | `replay.sh` | Structured failure context |
| `schema-baseline.sql` | `replay.sh` | Pre-replay schema dump |
| `schema-after.sql` | `replay.sh` | Post-replay schema dump |
| `function_signature_registry.json` | `build_function_registry.cjs` | All RPC signatures by migration |
| `migration_dependency_graph.json` | `build_migration_dependencies.cjs` | Forward/backward dependencies |
| `object_ownership_graph.json` | `build_ownership_graph.cjs` | Table -> creating migration mapping |

## Governance Integration

**Baseline**: `scripts/governance/baseline.json`
**Enforcement**: `scripts/governance/enforce-governance.cjs`
**Check command**: `npm run governance:check`

**Governance artifacts compared**:
- `function_signature_registry.json` - RPC signature stability
- `migration_dependency_graph.json` - Dependency drift detection
- `object_ownership_graph.json` - Table ownership integrity

**Determinism normalization**: Strips `timestamp` and `generated_at` before hashing

## Known Replay Patterns

### Success Pattern
```
80/80 migrations passed, 3565ms
Database: local Docker postgres
```

### Failure Pattern 1: Port Mismatch
```
Database URL: postgresql://...@127.0.0.1:54322/postgres
FATAL: Cannot connect to Postgres
```
- Cause: Supabase local runs on 54322, but replay script defaults to 5432
- Mitigation: Set `DATABASE_URL` explicitly or ensure Supabase is running

### Failure Pattern 2: Missing psql
```
FATAL: Cannot connect to Postgres at postgresql://...@localhost:5432/postgres
```
- Cause: No PostgreSQL running locally, no Docker fallback configured
- Mitigation: Run `supabase start` first, or use Docker replay container

## Replay Container

**Dockerfile**: `infra/migration-replay/Dockerfile`
**Compose**: `infra/migration-replay/docker-compose.yml`
**Purpose**: Isolated replay environment with PostgreSQL 15

## Critical Invariants

1. **Never run replay against production/staging directly** - always isolated environment
2. **Baseline hash must match previous run** - any drift indicates unauthorized migration change
3. **Failure.json must be machine-parseable** - used by CI and governance pipeline
4. **Schema snapshots are read-only** - never commit them to repo
