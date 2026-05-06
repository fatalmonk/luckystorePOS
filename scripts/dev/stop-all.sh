#!/bin/bash
# Stop all development servers
# Usage: ./scripts/dev/stop-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

PID_FILE="$PROJECT_ROOT/.dev-pids"

if [ ! -f "$PID_FILE" ]; then
    echo "❌ No running servers found"
    exit 0
fi

echo "🛑 Stopping all development servers..."

while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "  Stopping PID: $pid"
        kill "$pid"
    fi
done < "$PID_FILE"

rm -f "$PID_FILE"

echo "✅ All servers stopped!"
