#!/bin/bash
# Format code across the workspace
# Usage: ./scripts/tools/format-code.sh [--check|--fix]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MODE=${1:---fix}

echo "🎨 Formatting code (mode: $MODE)..."

# Format Python files
if command -v black &> /dev/null; then
    echo "  🐍 Formatting Python files..."
    if [ "$MODE" = "--check" ]; then
        black --check "$PROJECT_ROOT"
    else
        black "$PROJECT_ROOT"
    fi
fi

# Format JavaScript/TypeScript files
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "  📦 Formatting JavaScript/TypeScript files..."
    cd "$PROJECT_ROOT"
    if [ "$MODE" = "--check" ]; then
        npm run format:check 2>/dev/null || echo "  ⚠️  No format:check script found"
    else
        npm run format 2>/dev/null || echo "  ⚠️  No format script found"
    fi
fi

# Format Flutter/Dart files
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo "  📱 Formatting Flutter files..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    if [ "$MODE" = "--check" ]; then
        dart format --set-exit-if-changed .
    else
        dart format .
    fi
fi

# Format Admin Web files
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo "  🌐 Formatting Admin Web files..."
    cd "$PROJECT_ROOT/apps/admin_web"
    if [ "$MODE" = "--check" ]; then
        npm run format:check 2>/dev/null || echo "  ⚠️  No format:check script found"
    else
        npm run format 2>/dev/null || echo "  ⚠️  No format script found"
    fi
fi

echo "✨ Code formatting complete!"
