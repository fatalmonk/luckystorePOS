#!/bin/bash
# Run linting across the workspace
# Usage: ./scripts/tools/lint.sh [--fix]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

MODE=${1:---check}

echo "🔍 Running linters (mode: $MODE)..."

# Lint Python files
if command -v pylint &> /dev/null || command -v flake8 &> /dev/null; then
    echo "  🐍 Linting Python files..."
    if command -v pylint &> /dev/null; then
        pylint "$PROJECT_ROOT" --recursive=y
    elif command -v flake8 &> /dev/null; then
        flake8 "$PROJECT_ROOT"
    fi
fi

# Lint JavaScript/TypeScript files
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "  📦 Linting JavaScript/TypeScript files..."
    cd "$PROJECT_ROOT"
    if [ "$MODE" = "--fix" ]; then
        npm run lint:fix 2>/dev/null || echo "  ⚠️  No lint:fix script found"
    else
        npm run lint 2>/dev/null || echo "  ⚠️  No lint script found"
    fi
fi

# Lint Flutter/Dart files
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo "  📱 Linting Flutter files..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    flutter analyze
fi

# Lint Admin Web files
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo "  🌐 Linting Admin Web files..."
    cd "$PROJECT_ROOT/apps/admin_web"
    if [ "$MODE" = "--fix" ]; then
        npm run lint:fix 2>/dev/null || echo "  ⚠️  No lint:fix script found"
    else
        npm run lint 2>/dev/null || echo "  ⚠️  No lint script found"
    fi
fi

echo "✨ Linting complete!"
