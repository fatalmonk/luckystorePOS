#!/bin/bash
# Deploy Edge Function Script for Lucky Store POS

set -e  # Exit on error

# Resolve project reference from SUPABASE_PROJECT_REF or VITE_SUPABASE_URL
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$SUPABASE_PROJECT_REF" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  SUPABASE_PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https://([^/]+)\.supabase\.co|\1|')
fi
if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo "Error: SUPABASE_PROJECT_REF or VITE_SUPABASE_URL must be set"
  exit 1
fi

echo "🚀 Starting Edge Function Deployment..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if already linked
if [ -f ".supabase/config.toml" ]; then
    echo "ℹ️  Project appears to be linked. Skipping link step."
    echo "   If you need to re-link, delete .supabase/config.toml first"
else
    echo "🔐 Step 1: Logging in to Supabase..."
    echo "   (This will open your browser for authentication)"
    supabase login || {
        echo "❌ Login failed. Please run 'supabase login' manually first."
        exit 1
    }
    
    echo ""
    echo "🔗 Step 2: Linking project..."
    supabase link --project-ref "${SUPABASE_PROJECT_REF}" || {
        echo "❌ Failed to link project. Please check your project reference ID."
        exit 1
    }
fi

echo ""
echo "🔑 Step 3: Setting service role key..."
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set in your shell."
    echo "   Export it first, then re-run:"
    echo "   export SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key\""
    exit 1
fi
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" || {
    echo "⚠️  Warning: Failed to set secret. It may already be set or you may need to set it manually."
}

echo ""
echo "🚀 Step 4: Deploying import-inventory function..."
supabase functions deploy import-inventory || {
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
}

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Function Details:"
echo "   URL: https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/import-inventory"
echo "   Name: import-inventory"
echo ""
echo "📝 Next Steps:"
echo "   1. Verify function in dashboard: https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/functions"
echo "   2. Create storage bucket 'item-images' if not already created"
echo "   3. Test with a sample CSV file"
echo ""
echo "🧪 Test the function:"
echo "   curl -X POST https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/import-inventory \\"
echo "     -H \"Authorization: Bearer <anon-key>\" \\"
echo "     -H \"apikey: <anon-key>\" \\"
echo "     -F \"file=@test.csv\""
echo ""

