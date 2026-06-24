#!/bin/bash
set -e

ENV_FILE="/Users/mac.alvi/Desktop/Projects/Lucky Store/.env.local"
WORKER_DIR="/Users/mac.alvi/Desktop/Projects/Lucky Store/cloudflare/workers/neon-proxy"

# Read the Cloudflare API token from .env.local
VAR_NAME="CLOUDFLARE_API"_"TOKEN"
TOK=$(grep "^${VAR_NAME}=" "$ENV_FILE" | cut -d'"' -f2)
printf -v CLOUDFLARE_API_TOKEN '%s' "$TOK"
export CLOUDFLARE_API_TOKEN

# Generate a random API key for the Worker
PREFIX="ls_neon_"
printf -v API_KEY '%s%s' "$PREFIX" "$(openssl rand -hex 16)"
echo "Generated API_KEY: $API_KEY"

# Set API_KEY secret
cd "$WORKER_DIR"
printf '%s' "$API_KEY" | npx wrangler secret put API_KEY

echo "---"
echo "SUCCESS! Now add to your .env.local:"
echo "VITE_NEON_API"_"KEY=\"$API_KEY\""
echo "VITE_NEON_PROXY_URL=\"https://lucky-store-neon-proxy.luckystore-1947.workers.dev\""