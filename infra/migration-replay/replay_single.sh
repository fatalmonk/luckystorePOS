#!/usr/bin/env bash
# Replay a single migration file for targeted debugging
# Usage: ./replay_single.sh /path/to/migration.sql

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <migration_file>"
  exit 1
fi

MIGRATION_FILE="$1"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-.}"

if [ ! -f "${MIGRATION_FILE}" ]; then
  echo "Error: Migration file not found: ${MIGRATION_FILE}"
  exit 1
fi

echo "Replaying single migration: $(basename "${MIGRATION_FILE}")"
echo "Database URL: ${DATABASE_URL}"
echo ""

# Execute migration with verbose output
if psql "${DATABASE_URL}" \
  -v ON_ERROR_STOP=1 \
  -f "${MIGRATION_FILE}" 2>&1; then
  echo ""
  echo "✓ Migration successful"
  exit 0
else
  echo ""
  echo "✗ Migration failed"
  exit 1
fi
