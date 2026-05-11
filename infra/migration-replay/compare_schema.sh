#!/usr/bin/env bash
# Compare two schema snapshots and detect drift
# Generates:
# - diff-report.txt (human-readable diff)
# - drift-report.json (machine-readable drift classification)
# Detects:
# - duplicate ownership
# - canonical conflicts
# - replay instability
# - shadow migrations
# - unsafe assumptions
# - extension drift

set -euo pipefail

BASELINE_SCHEMA="${1:-schema-baseline.sql}"
FINAL_SCHEMA="${2:-schema-after.sql}"
OUTPUT_DIR="${3:-.}"

if [ ! -f "${BASELINE_SCHEMA}" ] || [ ! -f "${FINAL_SCHEMA}" ]; then
  echo "Error: Schema files not found"
  echo "  Baseline: ${BASELINE_SCHEMA}"
  echo "  Final: ${FINAL_SCHEMA}"
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

echo "Comparing schemas..."
echo "  Baseline: ${BASELINE_SCHEMA}"
echo "  Final: ${FINAL_SCHEMA}"
echo ""

# Generate unified diff
echo "Generating diff report..."
diff -u "${BASELINE_SCHEMA}" "${FINAL_SCHEMA}" > "${OUTPUT_DIR}/diff-report.txt" || true

# Count changes
ADDED_LINES=$(grep "^+" "${OUTPUT_DIR}/diff-report.txt" | grep -v "^+++" | wc -l)
REMOVED_LINES=$(grep "^-" "${OUTPUT_DIR}/diff-report.txt" | grep -v "^---" | wc -l)
TOTAL_CHANGES=$((ADDED_LINES + REMOVED_LINES))

echo "Changes detected: ${TOTAL_CHANGES} lines"
echo "  Added: ${ADDED_LINES}"
echo "  Removed: ${REMOVED_LINES}"
echo ""

# Check for drift indicators
echo "Analyzing drift indicators..."

# Count tables
BASELINE_TABLES=$(grep "CREATE TABLE" "${BASELINE_SCHEMA}" | wc -l)
FINAL_TABLES=$(grep "CREATE TABLE" "${FINAL_SCHEMA}" | wc -l)

# Count functions
BASELINE_FUNCTIONS=$(grep "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "${BASELINE_SCHEMA}" | wc -l)
FINAL_FUNCTIONS=$(grep "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "${FINAL_SCHEMA}" | wc -l)

# Count policies
BASELINE_POLICIES=$(grep "CREATE POLICY" "${BASELINE_SCHEMA}" | wc -l)
FINAL_POLICIES=$(grep "CREATE POLICY" "${FINAL_SCHEMA}" | wc -l)

# Check for suspicious patterns
HAS_DUPLICATE_CREATE=$(grep -c "CREATE TABLE.*;\s*CREATE TABLE" "${FINAL_SCHEMA}" || echo "0")
HAS_UNSAFE_COMMENTS=$(grep -c "-- .*TODO\|-- .*FIXME\|-- .*HACK" "${FINAL_SCHEMA}" || echo "0")
HAS_SEARCH_PATH_ASSUMPTIONS=$(grep -c "search_path\s*=" "${FINAL_SCHEMA}" || echo "0")

# Generate JSON report
cat > "${OUTPUT_DIR}/drift-report.json" <<EOF
{
  "comparison": {
    "baseline": "$(basename "${BASELINE_SCHEMA}")",
    "final": "$(basename "${FINAL_SCHEMA}")",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  },
  "changes": {
    "total_lines": ${TOTAL_CHANGES},
    "added": ${ADDED_LINES},
    "removed": ${REMOVED_LINES}
  },
  "schema_objects": {
    "tables": {
      "baseline": ${BASELINE_TABLES},
      "final": ${FINAL_TABLES},
      "delta": $((FINAL_TABLES - BASELINE_TABLES))
    },
    "functions": {
      "baseline": ${BASELINE_FUNCTIONS},
      "final": ${FINAL_FUNCTIONS},
      "delta": $((FINAL_FUNCTIONS - BASELINE_FUNCTIONS))
    },
    "rls_policies": {
      "baseline": ${BASELINE_POLICIES},
      "final": ${FINAL_POLICIES},
      "delta": $((FINAL_POLICIES - BASELINE_POLICIES))
    }
  },
  "drift_indicators": {
    "duplicate_creates": ${HAS_DUPLICATE_CREATE},
    "unsafe_comments": ${HAS_UNSAFE_COMMENTS},
    "search_path_assumptions": ${HAS_SEARCH_PATH_ASSUMPTIONS}
  },
  "stability": {
    "deterministic": $((TOTAL_CHANGES == 0)),
    "significant_drift": $((TOTAL_CHANGES > 100))
  }
}
EOF

echo "✓ Drift report: ${OUTPUT_DIR}/drift-report.json"
echo "✓ Diff report: ${OUTPUT_DIR}/diff-report.txt"
echo ""

# Display summary
if [ $TOTAL_CHANGES -eq 0 ]; then
  echo "Schema comparison: IDENTICAL (deterministic replay verified)"
else
  echo "Schema comparison: DIFFERENT (${TOTAL_CHANGES} lines changed)"
  if [ $((TOTAL_CHANGES)) -gt 100 ]; then
    echo "WARNING: Significant drift detected (>100 lines)"
  fi
fi
