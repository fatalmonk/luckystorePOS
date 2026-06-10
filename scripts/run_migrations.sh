TOKEN="${SUPABASE_TOKEN:-}"
if [ -z "$TOKEN" ]; then echo "Set SUPABASE_TOKEN env var"; exit 1; fi
URL="https://api.supabase.com/v1/projects/hvmyxyccfnkrbxqbhlnm/database/query"
DIR="/Users/mac.alvi/Desktop/Projects/Lucky Store/supabase/migrations"

for f in "$DIR"/20260611*.sql; do
  echo "=== $(basename "$f") ==="
  curl -s -X POST "$URL" \
    -H "Authorization: Bearer ***    -H "Content-Type: application/json" \
    -d @<(jq -n --arg sql "$(cat "$f")" '{query: $sql}')
  echo ""
done
