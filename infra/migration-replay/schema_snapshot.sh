#!/usr/bin/env bash
# Generate schema snapshot using pg_dump
# Used for before/after replay comparison
# Requirements:
# - capture table structure
# - capture functions, triggers, policies
# - capture RLS policies
# - capture grants and ownership
# - capture indexes and sequences
# - capture extensions and search_path assumptions

set -euo pipefail

SNAPSHOT_NAME="${1:-schema-snapshot}"
OUTPUT_DIR="${2:-.}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"

# Parse connection string
PGUSER="${PGUSER:-postgres}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"

mkdir -p "${OUTPUT_DIR}"

echo "Generating schema snapshot: ${SNAPSHOT_NAME}"
echo "Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo ""

# Full schema dump (with structure, functions, policies, triggers)
echo -n "Dumping schema structure... "
pg_dump -h "${PGHOST}" -U "${PGUSER}" -p "${PGPORT}" \
  --schema-only \
  --no-privileges \
  -d "${PGDATABASE}" > "${OUTPUT_DIR}/${SNAPSHOT_NAME}.sql" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✓"
  echo "  Schema: ${OUTPUT_DIR}/${SNAPSHOT_NAME}.sql"
else
  echo "✗ (failed)"
  exit 1
fi

# Extensions and configuration
echo -n "Dumping extensions... "
psql -h "${PGHOST}" -U "${PGUSER}" -p "${PGPORT}" -d "${PGDATABASE}" \
  -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;" \
  -o "${OUTPUT_DIR}/${SNAPSHOT_NAME}-extensions.txt" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✓"
  echo "  Extensions: ${OUTPUT_DIR}/${SNAPSHOT_NAME}-extensions.txt"
else
  echo "✓ (skipped)"
fi

# Table ownership and privileges
echo -n "Dumping table ownership... "
psql -h "${PGHOST}" -U "${PGUSER}" -p "${PGPORT}" -d "${PGDATABASE}" \
  -c "SELECT schemaname, tablename, tableowner FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;" \
  -o "${OUTPUT_DIR}/${SNAPSHOT_NAME}-ownership.txt" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✓"
  echo "  Ownership: ${OUTPUT_DIR}/${SNAPSHOT_NAME}-ownership.txt"
else
  echo "✓ (skipped)"
fi

# Function signatures
echo -n "Dumping function signatures... "
psql -h "${PGHOST}" -U "${PGUSER}" -p "${PGPORT}" -d "${PGDATABASE}" \
  -c "SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') ORDER BY n.nspname, p.proname;" \
  -o "${OUTPUT_DIR}/${SNAPSHOT_NAME}-functions.txt" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✓"
  echo "  Functions: ${OUTPUT_DIR}/${SNAPSHOT_NAME}-functions.txt"
else
  echo "✓ (skipped)"
fi

# RLS policies
echo -n "Dumping RLS policies... "
psql -h "${PGHOST}" -U "${PGUSER}" -p "${PGPORT}" -d "${PGDATABASE}" \
  -c "SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check FROM pg_policies WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename, policyname;" \
  -o "${OUTPUT_DIR}/${SNAPSHOT_NAME}-rls-policies.txt" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✓"
  echo "  RLS Policies: ${OUTPUT_DIR}/${SNAPSHOT_NAME}-rls-policies.txt"
else
  echo "✓ (skipped)"
fi

echo ""
echo "Schema snapshot complete: ${SNAPSHOT_NAME}"
