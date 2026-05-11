#!/usr/bin/env bash
# Deterministic migration replay engine
# Requirements:
# - iterate migrations deterministically (filename-based ordering)
# - stop immediately on failure
# - capture migration filename
# - capture line number if possible
# - capture failing SQL
# - capture stderr + stdout
# - produce machine-readable artifacts
# - measure timing metrics
# - support AI diagnosis pipeline

set -euo pipefail

# Configuration
ARTIFACTS_DIR="${ARTIFACTS_DIR:-.}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
REPLAY_STRICT="${REPLAY_STRICT:-true}"
REPLAY_STOP_ON_FIRST_ERROR="${REPLAY_STOP_ON_FIRST_ERROR:-true}"
REPLAY_CAPTURE_CONTEXT="${REPLAY_CAPTURE_CONTEXT:-true}"

# State tracking
MIGRATION_COUNT=0
MIGRATION_PASSED=0
MIGRATION_FAILED=0
FAILED_MIGRATION=""
REPLAY_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPLAY_START_EPOCH=$(date +%s%N)

# Color codes for CLI output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure artifacts directory exists
mkdir -p "${ARTIFACTS_DIR}"

# Initialize logs
REPLAY_LOG="${ARTIFACTS_DIR}/replay.log"
REPLAY_ERRORS="${ARTIFACTS_DIR}/replay-errors.log"

exec > >(tee -a "${REPLAY_LOG}")
exec 2> >(tee -a "${REPLAY_ERRORS}" >&2)

echo -e "${BLUE}=== Deterministic Migration Replay Engine ===${NC}"
echo "Start time: ${REPLAY_START_TIME}"
echo "Database URL: ${DATABASE_URL}"
echo "Artifacts directory: ${ARTIFACTS_DIR}"
echo ""

# Helper: Write failure.json with machine-readable context
write_failure_json() {
  local migration_file="$1"
  local line_number="${2:-0}"
  local failing_sql="${3:-unknown}"
  local error_message="${4:-unknown error}"
  local stderr_output="${5:-}"
  local classification="${6:-unknown}"

  cat > "${ARTIFACTS_DIR}/failure.json" <<EOF
{
  "migration": "$(basename "${migration_file}")",
  "migration_full_path": "${migration_file}",
  "line": ${line_number},
  "sql": $(echo "${failing_sql}" | jq -Rs .),
  "error": $(echo "${error_message}" | jq -Rs .),
  "stderr": $(echo "${stderr_output}" | jq -Rs .),
  "classification": "${classification}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "replay_mode": "full",
  "stop_on_first_error": ${REPLAY_STOP_ON_FIRST_ERROR}
}
EOF

  echo -e "${RED}Failure context written to: ${ARTIFACTS_DIR}/failure.json${NC}"
}

# Helper: Try to extract line number from error
extract_line_number_from_error() {
  local error_output="$1"
  echo "${error_output}" | grep -oP 'line \K[0-9]+' | head -1 || echo "0"
}

# Helper: Extract failing SQL line (best effort)
extract_failing_sql_line() {
  local migration_file="$1"
  local line_number="${2:-0}"

  if [ "${line_number}" -gt 0 ] && [ -f "${migration_file}" ]; then
    sed -n "${line_number}p" "${migration_file}" || echo ""
  else
    head -1 "${migration_file}" || echo ""
  fi
}

# Verify Postgres connectivity before starting replay
verify_postgres_connectivity() {
  echo -e "${BLUE}Verifying Postgres connectivity...${NC}"
  
  if ! psql "${DATABASE_URL}" -c "SELECT 1;" &>/dev/null; then
    echo -e "${RED}FATAL: Cannot connect to Postgres at ${DATABASE_URL}${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Postgres connectivity verified${NC}"
}

# Generate baseline schema snapshot (before replay)
generate_baseline_schema() {
  echo -e "${BLUE}Generating baseline schema snapshot...${NC}"
  
  pg_dump -h "${PGHOST:-localhost}" -U "${PGUSER:-postgres}" \
    --schema-only \
    --no-privileges \
    -d "${PGDATABASE:-postgres}" > "${ARTIFACTS_DIR}/schema-baseline.sql" 2>/dev/null || {
    echo -e "${YELLOW}Warning: Could not generate baseline schema${NC}"
    return 1
  }
  
  echo -e "${GREEN}✓ Baseline schema saved to: ${ARTIFACTS_DIR}/schema-baseline.sql${NC}"
}

# Replay each migration deterministically
replay_migrations() {
  echo -e "${BLUE}Starting migration replay...${NC}"
  echo ""

  local migration_dir="${MIGRATIONS_DIR:-/migrations}"
  
  # Ensure migrations directory exists
  if [ ! -d "${migration_dir}" ]; then
    echo -e "${RED}FATAL: Migrations directory not found: ${migration_dir}${NC}"
    exit 1
  fi

  # Deterministic ordering: by filename (lexicographic = chronological for our naming scheme)
  while IFS= read -r -d '' migration_file; do
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    local migration_name=$(basename "${migration_file}")
    local migration_start=$(date +%s%N)

    echo -n "[$((MIGRATION_COUNT))] ${migration_name}... "

    # Execute migration with strict error handling
    local error_output=""
    local exit_code=0

    if ! error_output=$(psql "${DATABASE_URL}" \
      -v ON_ERROR_STOP=1 \
      -f "${migration_file}" 2>&1); then
      exit_code=$?
    fi

    local migration_end=$(date +%s%N)
    local migration_duration_ms=$(( (migration_end - migration_start) / 1000000 ))

    if [ ${exit_code} -eq 0 ]; then
      echo -e "${GREEN}✓ (${migration_duration_ms}ms)${NC}"
      MIGRATION_PASSED=$((MIGRATION_PASSED + 1))
    else
      echo -e "${RED}✗ FAILED (${migration_duration_ms}ms)${NC}"
      MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
      FAILED_MIGRATION="${migration_file}"

      # Extract failure context
      local line_number=$(extract_line_number_from_error "${error_output}")
      local failing_sql=$(extract_failing_sql_line "${migration_file}" "${line_number}")
      
      write_failure_json \
        "${migration_file}" \
        "${line_number}" \
        "${failing_sql}" \
        "${error_output}" \
        "${error_output}" \
        "replay_failure"

      if [ "${REPLAY_STOP_ON_FIRST_ERROR}" == "true" ]; then
        echo -e "${RED}Stopping replay due to failure (REPLAY_STOP_ON_FIRST_ERROR=true)${NC}"
        return 1
      fi
    fi
  done < <(find "${migration_dir}" -maxdepth 1 -name "*.sql" -type f -print0 | sort -z)

  return 0
}

# Generate final schema snapshot (after replay)
generate_final_schema() {
  echo -e "${BLUE}Generating final schema snapshot...${NC}"
  
  pg_dump -h "${PGHOST:-localhost}" -U "${PGUSER:-postgres}" \
    --schema-only \
    --no-privileges \
    -d "${PGDATABASE:-postgres}" > "${ARTIFACTS_DIR}/schema-after.sql" 2>/dev/null || {
    echo -e "${YELLOW}Warning: Could not generate final schema${NC}"
    return 1
  }
  
  echo -e "${GREEN}✓ Final schema saved to: ${ARTIFACTS_DIR}/schema-after.sql${NC}"
}

# Main replay execution
main() {
  verify_postgres_connectivity
  generate_baseline_schema
  
  if ! replay_migrations; then
    local replay_end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local replay_duration_ms=$(( ($(date +%s%N) - REPLAY_START_EPOCH) / 1000000 ))

    echo ""
    echo -e "${RED}=== Replay Failed ===${NC}"
    echo "Failed migration: ${FAILED_MIGRATION}"
    echo "Duration: ${replay_duration_ms}ms"
    echo "See ${ARTIFACTS_DIR}/failure.json for details"
    
    exit 1
  fi

  generate_final_schema
  
  local replay_end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local replay_duration_ms=$(( ($(date +%s%N) - REPLAY_START_EPOCH) / 1000000 ))

  echo ""
  echo -e "${GREEN}=== Replay Successful ===${NC}"
  echo "Migrations passed: ${MIGRATION_PASSED}/${MIGRATION_COUNT}"
  echo "End time: ${replay_end_time}"
  echo "Total duration: ${replay_duration_ms}ms"
  echo ""

  # Generate replay report
  if command -v node &> /dev/null; then
    echo -e "${BLUE}Generating replay report...${NC}"
    node /replay-scripts/replay_report.cjs \
      "${REPLAY_START_TIME}" \
      "${replay_end_time}" \
      "${replay_duration_ms}" \
      "${MIGRATION_COUNT}" \
      "${MIGRATION_PASSED}" \
      "${ARTIFACTS_DIR}"

    # Generate advanced analysis reports
    echo -e "${BLUE}Generating object ownership analysis...${NC}"
    node /replay-scripts/build_ownership_graph.cjs \
      /migrations \
      "${ARTIFACTS_DIR}"

    echo -e "${BLUE}Generating function signature registry...${NC}"
    node /replay-scripts/build_function_registry.cjs \
      /migrations \
      "${ARTIFACTS_DIR}"

    echo -e "${BLUE}Generating migration dependency graph...${NC}"
    node /replay-scripts/build_migration_dependencies.cjs \
      /migrations \
      "${ARTIFACTS_DIR}"
  fi
}

# Execute main
main
