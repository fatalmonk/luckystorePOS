#!/bin/bash
# Clean build artifacts, cache, and temporary files
# Usage: ./scripts/tools/clean.sh [--all|--deep]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CLEAN_ALL=false
CLEAN_DEEP=false

for arg in "$@"; do
    case $arg in
        --all) CLEAN_ALL=true ;;
        --deep) CLEAN_DEEP=true ;;
    esac
done

echo "🧹 Cleaning workspace..."

# Clean Python cache
echo "  📦 Cleaning Python cache..."
find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$PROJECT_ROOT" -type f -name "*.pyc" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -type f -name "*.pyo" -delete 2>/dev/null || true

# Clean Node modules (only with --all)
if [ "$CLEAN_ALL" = true ]; then
    echo "  📦 Cleaning node_modules..."
    find "$PROJECT_ROOT" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
fi

# Clean Flutter build artifacts
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo "  📱 Cleaning Flutter build..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    flutter clean
fi

# Clean Vite/Next.js build artifacts
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo "  🌐 Cleaning Admin Web build..."
    rm -rf "$PROJECT_ROOT/apps/admin_web/dist"
    rm -rf "$PROJECT_ROOT/apps/admin_web/.vite"
fi

# Clean Docker artifacts
if [ "$CLEAN_DEEP" = true ]; then
    echo "  🐳 Cleaning Docker artifacts..."
    docker system prune -f
fi

# Clean temporary files
echo "  🗑️  Cleaning temporary files..."
find "$PROJECT_ROOT" -type f -name "*.log" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -type f -name "*.tmp" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -type f -name ".DS_Store" -delete 2>/dev/null || true

# Clean .venv (only with --deep)
if [ "$CLEAN_DEEP" = true ] && [ -d "$PROJECT_ROOT/.venv" ]; then
    echo "  🐍 Removing Python virtual environment..."
    rm -rf "$PROJECT_ROOT/.venv"
fi

echo "✨ Clean complete!"
