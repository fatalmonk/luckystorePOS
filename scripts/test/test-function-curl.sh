#!/bin/bash
# Simple curl test for import-inventory function

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_CSV="$REPO_ROOT/data/samples/test-sample.csv"

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "Error: VITE_SUPABASE_URL is not set. Export it before running this script."
  exit 1
fi
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
FUNCTION_URL="${VITE_SUPABASE_URL}/functions/v1/import-inventory"
CSV_FILE="${1:-$DEFAULT_CSV}"

echo "Testing import-inventory function..."
echo "File: $CSV_FILE"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -F "file=@$CSV_FILE" \
  -w "\n\nHTTP Status: %{http_code}\n"

