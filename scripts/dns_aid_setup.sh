#!/bin/bash
# DNS-AID setup for luckystore1947.com
# Usage: Provide cloudflare token via environment variable
#   or:  source .env.local && ./scripts/dns_aid_setup.sh

# Read token from env — never hardcode here
printf -v TOKEN '%s' "${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  # Fallback: try loading from .env.local in repo root
  ENV_FILE="$(dirname "$0")/../.env.local"
  if [[ -f "$ENV_FILE" ]]; then
    VAR_NAME="CLOUDFLARE_API"_"TOKEN"
    printf -v TOKEN '%s' "$(grep "^${VAR_NAME}=" "$ENV_FILE" | cut -d'"' -f2 | tr -d "'")"
  fi
fi

if [[ -z "$TOKEN" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN is not set."
  echo "Export it or add it to .env.local before running this script."
  exit 1
fi

ZONE_ID="cadbf71f2c3aee47e0c299319cba570d"
BASE_URL="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"

echo "=== Enabling DNSSEC ==="
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dnssec" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('DNSSEC:', d['result']['status'])

echo ""
echo "=== Creating SVCB records ==="

# _index._agents — organizational agent index
echo "--- _index._agents ---"
curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SVCB",
    "name": "_index._agents.luckystore1947.com",
    "data": {
      "priority": 1,
      "target": "images.luckystore1947.com.",
      "value": "alpn=\"a2a\" port=\"443\" mandatory=\"alpn,port\""
    },
    "ttl": 3600
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('success' if d['success'] else d['errors'])

# _a2a._agents — A2A agent endpoint
echo "--- _a2a._agents ---"
curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SVCB",
    "name": "_a2a._agents.luckystore1947.com",
    "data": {
      "priority": 1,
      "target": "images.luckystore1947.com.",
      "value": "alpn=\"a2a\" port=\"443\" mandatory=\"alpn,port\""
    },
    "ttl": 3600
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('success' if d['success'] else d['errors'])

# _mcp._agents — MCP agent endpoint
echo "--- _mcp._agents ---"
curl -s -X POST "${BASE_URL}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SVCB",
    "name": "_mcp._agents.luckystore1947.com",
    "data": {
      "priority": 1,
      "target": "images.luckystore1947.com.",
      "value": "alpn=\"mcp\" port=\"443\" mandatory=\"alpn,port\""
    },
    "ttl": 3600
  }' | python3 -c "import json,sys; d=json.load(sys.stdin); print('success' if d['success'] else d['errors'])

echo ""
echo "=== Verifying all records ==="
curl -s "${BASE_URL}?per_page=20&type=SVCB" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('result',[]):
    print(f\"  {r['type']} {r['name']} -> {r['data']['target']} [{r['data']['value']}]\")
"
