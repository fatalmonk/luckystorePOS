#!/bin/bash

# Deploy POS checkout edge functions to Supabase project.
# Make sure you are logged in: supabase login

set -e

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ]; then
  # Derive from VITE_SUPABASE_URL if available (e.g. https://abc.supabase.co -> abc)
  if [ -n "${VITE_SUPABASE_URL:-}" ]; then
    PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https://([^/]+)\.supabase\.co|\1|')
  else
    echo "Error: SUPABASE_PROJECT_REF or VITE_SUPABASE_URL must be set"
    exit 1
  fi
fi

echo "🚀 Deploying POS checkout functions to ${PROJECT_REF}..."

supabase functions deploy create-sale --project-ref "${PROJECT_REF}"
supabase functions deploy create-card-checkout --project-ref "${PROJECT_REF}"
supabase functions deploy payment-return-success --project-ref "${PROJECT_REF}" --no-verify-jwt
supabase functions deploy payment-return-fail --project-ref "${PROJECT_REF}" --no-verify-jwt
supabase functions deploy payment-return-cancel --project-ref "${PROJECT_REF}" --no-verify-jwt
supabase functions deploy payment-ipn --project-ref "${PROJECT_REF}" --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "Next step: ensure these secrets are set on ${PROJECT_REF}:"
echo "  SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD, SSLCOMMERZ_IS_LIVE, FRONTEND_BASE_URL"

