#!/bin/bash
# Start all development servers
# Usage: ./scripts/dev/start-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting all development servers..."

# Start Supabase local
echo ""
echo "🗄️  Starting Supabase local..."
cd "$PROJECT_ROOT"
supabase start &
SUPABASE_PID=$!

# Start Admin Web
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo ""
    echo "🌐 Starting Admin Web..."
    cd "$PROJECT_ROOT/apps/admin_web"
    npm run dev &
    ADMIN_PID=$!
fi

# Start Mobile App (if desired)
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo ""
    echo "📱 Mobile App - run 'flutter run' in apps/mobile_app"
fi

echo ""
echo "✨ All servers started!"
echo ""
echo "📝 PIDs:"
echo "   Supabase: $SUPABASE_PID"
[ -n "$ADMIN_PID" ] && echo "   Admin Web: $ADMIN_PID"
echo ""
echo "🛑 Stop servers with: ./scripts/dev/stop-all.sh"

# Save PIDs for stop script
echo "$SUPABASE_PID" > "$PROJECT_ROOT/.dev-pids"
[ -n "$ADMIN_PID" ] && echo "$ADMIN_PID" >> "$PROJECT_ROOT/.dev-pids"
