#!/bin/bash
# Git sync operations - pull, push, and status
# Usage: ./scripts/git/git-sync.sh [pull|push|status] [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

ACTION=${1:-status}
BRANCH=${2:-$(git -C "$PROJECT_ROOT" branch --show-current)}

echo "🔄 Git operation: $ACTION (branch: $BRANCH)"

cd "$PROJECT_ROOT"

case $ACTION in
    pull)
        echo "📥 Pulling latest changes..."
        git pull origin "$BRANCH"
        echo "✅ Pull complete"
        ;;
    push)
        echo "📤 Pushing changes..."
        git push origin "$BRANCH"
        echo "✅ Push complete"
        ;;
    status)
        echo "📊 Git status..."
        git status
        echo ""
        echo "📝 Recent commits:"
        git log --oneline -5
        ;;
    sync)
        echo "🔄 Syncing with remote..."
        git pull origin "$BRANCH"
        git push origin "$BRANCH"
        echo "✅ Sync complete"
        ;;
    *)
        echo "❌ Error: Invalid action. Use pull, push, status, or sync"
        exit 1
        ;;
esac
