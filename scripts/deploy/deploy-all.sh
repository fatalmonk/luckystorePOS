#!/bin/bash
# Deploy all applications
# Usage: ./scripts/deploy/deploy-all.sh [dev|staging|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

ENV=${1:-dev}

echo "🚀 Deploying all applications to $ENV..."

# Deploy Admin Web
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo ""
    echo "🌐 Deploying Admin Web..."
    cd "$PROJECT_ROOT/apps/admin_web"
    if [ "$ENV" = "prod" ]; then
        vercel --prod
    else
        vercel
    fi
    echo "✅ Admin Web deployed"
fi

# Deploy Mobile App
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo ""
    echo "📱 Deploying Mobile App..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    # Add your mobile deployment logic here
    echo "⚠️  Mobile deployment requires manual steps"
fi

# Deploy Edge Functions
if [ -d "$PROJECT_ROOT/supabase/functions" ]; then
    echo ""
    echo "⚡ Deploying Edge Functions..."
    cd "$PROJECT_ROOT"
    supabase functions deploy
    echo "✅ Edge Functions deployed"
fi

echo ""
echo "✨ Deployment complete!"
