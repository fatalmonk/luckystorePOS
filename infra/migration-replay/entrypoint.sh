#!/bin/bash
# Entrypoint script for migration-replay container
# Orchestrates complete replay workflow:
# 1. Baseline schema capture
# 2. Deterministic migration replay
# 3. Final schema capture
# 4. Schema comparison and drift detection
# 5. Migration classification
# 6. Report generation

set -euo pipefail

ARTIFACTS_DIR="${ARTIFACTS_DIR:-.}"

echo "======================================"
echo "Migration Replay Workflow"
echo "======================================"
echo ""

# Step 1: Baseline schema
echo "Step 1/5: Baseline schema capture"
/replay-scripts/schema_snapshot.sh "schema-baseline" "${ARTIFACTS_DIR}"
echo ""

# Step 2: Migration replay
echo "Step 2/5: Deterministic migration replay"
if /replay-scripts/replay.sh; then
  REPLAY_SUCCESS=true
else
  REPLAY_SUCCESS=false
fi
echo ""

# Step 3: Final schema
if [ "${REPLAY_SUCCESS}" = true ]; then
  echo "Step 3/5: Final schema capture"
  /replay-scripts/schema_snapshot.sh "schema-after" "${ARTIFACTS_DIR}"
  echo ""

  # Step 4: Schema comparison
  echo "Step 4/5: Schema comparison and drift detection"
  /replay-scripts/compare_schema.sh \
    "${ARTIFACTS_DIR}/schema-baseline.sql" \
    "${ARTIFACTS_DIR}/schema-after.sql" \
    "${ARTIFACTS_DIR}"
  echo ""
else
  echo "Step 3/5: Skipping schema capture (replay failed)"
  echo ""
fi

# Step 5: Migration classification
echo "Step 5/5: Migration classification"
node /replay-scripts/classify_migrations.cjs /migrations "${ARTIFACTS_DIR}"
echo ""

echo "======================================"
echo "Replay Workflow Complete"
echo "======================================"
echo ""
echo "Artifacts:"
ls -la "${ARTIFACTS_DIR}"/*.json "${ARTIFACTS_DIR}"/*.sql "${ARTIFACTS_DIR}"/*.txt 2>/dev/null || true
echo ""

if [ "${REPLAY_SUCCESS}" = true ]; then
  echo "✓ Replay successful - see replay-report.md"
  exit 0
else
  echo "✗ Replay failed - see failure.json for details"
  exit 1
fi
