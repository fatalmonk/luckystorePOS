# Runbook: Migration Replay

## Prerequisites
- PostgreSQL running (local Docker or Supabase local)
- `DATABASE_URL` set correctly

## Correct Replay Command

```bash
cd /Users/ioriimasu/dev/luckystorePOS

# For local Docker PostgreSQL:
export DATABASE_URL="postgresql://postgres:***@localhost:5432/postgres"

# For Supabase local:
export DATABASE_URL="postgresql://postgres:***@localhost:54322/postgres"

# Run replay
ARTIFACTS_DIR=./artifacts bash infra/migration-replay/replay.sh
```

## Using Docker Replay Container

```bash
cd infra/migration-replay
docker-compose up
```

## Interpreting Results

| Output | Meaning |
|---|---|
| `80/80 passed` | All migrations replayed successfully |
| `FATAL: Cannot connect` | Wrong port or PostgreSQL not running |
| `✗ FAILED` | Migration has error; check `failure.json` |

## Artifacts Generated

- `artifacts/replay.log` - Human trace
- `artifacts/replay-errors.log` - stderr
- `artifacts/failure.json` - Structured failure (if any)
- `artifacts/schema-baseline.sql` - Pre-replay schema
- `artifacts/schema-after.sql` - Post-replay schema

## Common Failures

1. **Port mismatch**: Set `DATABASE_URL` to actual PostgreSQL port
2. **psql not found**: Install PostgreSQL client or use Docker container
3. **Migration syntax error**: Check `failure.json` for line number and SQL
