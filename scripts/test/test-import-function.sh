#!/bin/bash
# Test script for import-inventory edge function

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing Import Inventory Edge Function${NC}"
echo ""

# Supabase credentials (read from environment)
if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo -e "${RED}Error: VITE_SUPABASE_URL is not set. Export it before running this script.${NC}"
  exit 1
fi
SUPABASE_URL="${VITE_SUPABASE_URL}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/import-inventory"

# Check if CSV file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No CSV file provided${NC}"
    echo ""
    echo "Usage: ./scripts/test/test-import-function.sh <path-to-csv-file>"
    echo "Example: ./scripts/test/test-import-function.sh test.csv"
    echo ""
    exit 1
fi

CSV_FILE="$1"

# Check if file exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}❌ Error: File '$CSV_FILE' not found${NC}"
    exit 1
fi

echo -e "${GREEN}📁 File:${NC} $CSV_FILE"
echo -e "${GREEN}🔗 URL:${NC} $FUNCTION_URL"
echo ""

# Make the request
echo -e "${YELLOW}📤 Sending request...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$CSV_FILE")

# Split response and HTTP code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}📥 Response:${NC}"
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ Success!${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Error (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo "1. Make sure the function is deployed: supabase functions list"
    echo "2. Check function logs: supabase functions logs import-inventory"
    echo "3. Verify your anon key is correct"
    echo "4. Ensure the CSV file has the correct format"
fi

