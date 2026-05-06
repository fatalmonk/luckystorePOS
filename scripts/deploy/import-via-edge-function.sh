#!/bin/bash
# Import Shwapno products using the edge function
# This imports products, then we'll add competitor prices separately

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CSV_DIR="$REPO_ROOT/data/competitors/shwapno"

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "Error: VITE_SUPABASE_URL is not set. Export it before running this script."
  exit 1
fi
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
FUNCTION_URL="${VITE_SUPABASE_URL}/functions/v1/import-inventory"

echo "🚀 Importing Shwapno Products via Edge Function"
echo ""

# Get all CSV files
files=(
  "shwapno-bakingneeds.csv"
  "shwapno-beverage.csv"
  "shwapno-breakfast.csv"
  "shwapno-candy&chocolate.csv"
  "shwapno-cookingneeds.csv"
  "shwapno-dairy.csv"
  "shwapno-eggs.csv"
  "shwapno-icecream.csv"
  "shwapno-products (1).csv"
  "shwapno-sauces&pickles.csv"
  "shwapno-snacks.csv"
)

total_imported=0
total_errors=0

for file in "${files[@]}"; do
  filepath="$CSV_DIR/$file"
  
  if [ ! -f "$filepath" ]; then
    echo "⚠️  File not found: $filepath"
    continue
  fi
  
  echo "📄 Importing: $file"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" \
    -F "file=@$filepath")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    items=$(echo "$body" | grep -o '"items_inserted":[0-9]*' | grep -o '[0-9]*')
    updated=$(echo "$body" | grep -o '"items_updated":[0-9]*' | grep -o '[0-9]*')
    echo "   ✅ Items inserted: ${items:-0}"
    echo "   ✅ Items updated: ${updated:-0}"
    total_imported=$((total_imported + ${items:-0} + ${updated:-0}))
  else
    echo "   ❌ Error (HTTP $http_code)"
    echo "$body" | head -3
    total_errors=$((total_errors + 1))
  fi
  
  echo ""
  sleep 1  # Rate limiting
done

echo "📊 Summary:"
echo "   ✅ Total items processed: $total_imported"
echo "   ⚠️  Errors: $total_errors"
echo ""
echo "💡 Next step: Run the competitor prices script to add Shwapno prices"
echo "   node scripts/add-competitor-prices.js"

