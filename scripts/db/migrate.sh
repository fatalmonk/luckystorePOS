#!/bin/bash
# Run database migrations
# Usage: ./scripts/db/migrate.sh [up|down|reset]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

ACTION=${1:-up}

echo "🔄 Running database migrations: $ACTION"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

cd "$PROJECT_ROOT"

case $ACTION in
    up)
        echo "📈 Applying migrations..."
        supabase db push
        ;;
    down)
        echo "📉 Rolling back last migration..."
        supabase db reset
        ;;
    reset)
        echo "🔄 Resetting database..."
        read -p "⚠️  This will delete all data. Continue? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            supabase db reset
        else
            echo "❌ Reset cancelled"
            exit 0
        fi
        ;;
    status)
        echo "📊 Migration status..."
        supabase db diff
        ;;
    *)
        echo "❌ Error: Invalid action. Use up, down, reset, or status"
        exit 1
        ;;
esac

echo "✅ Migration complete!"
