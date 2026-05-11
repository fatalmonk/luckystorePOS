#!/usr/bin/env bash
# Extract failure context from Postgres error output
# Parses psql errors and generates structured failure artifacts
# Used by replay.sh to capture deterministic failure information

set -euo pipefail

ARTIFACTS_DIR="${ARTIFACTS_DIR:-.}"
MIGRATION_FILE="${1:-}"
ERROR_OUTPUT="${2:-}"

if [ -z "${MIGRATION_FILE}" ] || [ -z "${ERROR_OUTPUT}" ]; then
  echo "Usage: $0 <migration_file> <error_output>" >&2
  exit 1
fi

# Helper: Extract line number from psql error
extract_line_number() {
  echo "${ERROR_OUTPUT}" | grep -oP 'line \K[0-9]+' | head -1 || echo "0"
}

# Helper: Extract SQL context
extract_sql_context() {
  local line_num="$1"
  local file="$2"
  
  if [ "${line_num}" -gt 0 ] && [ -f "${file}" ]; then
    # Show context: 2 lines before, failing line, 2 lines after
    local start=$((line_num - 2))
    if [ $start -lt 1 ]; then start=1; fi
    local end=$((line_num + 2))
    
    sed -n "${start},${end}p" "${file}"
  else
    head -5 "${file}"
  fi
}

# Helper: Extract error code
extract_error_code() {
  echo "${ERROR_OUTPUT}" | grep -oP 'ERROR:\s+\K[A-Z0-9]+' | head -1 || echo "UNKNOWN"
}

# Helper: Extract error message
extract_error_message() {
  echo "${ERROR_OUTPUT}" | grep "ERROR:" | head -1 || echo "${ERROR_OUTPUT}"
}

# Generate structured failure output
LINE_NUMBER=$(extract_line_number)
ERROR_CODE=$(extract_error_code)
ERROR_MESSAGE=$(extract_error_message)
SQL_CONTEXT=$(extract_sql_context "${LINE_NUMBER}" "${MIGRATION_FILE}")

cat > "${ARTIFACTS_DIR}/failure-context.json" <<EOF
{
  "migration": "$(basename "${MIGRATION_FILE}")",
  "migration_path": "${MIGRATION_FILE}",
  "error_code": "${ERROR_CODE}",
  "error_message": $(echo "${ERROR_MESSAGE}" | jq -Rs .),
  "line_number": ${LINE_NUMBER},
  "sql_context": $(echo "${SQL_CONTEXT}" | jq -Rs .),
  "full_error": $(echo "${ERROR_OUTPUT}" | jq -Rs .),
  "extracted_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Failure context extracted to: ${ARTIFACTS_DIR}/failure-context.json"
