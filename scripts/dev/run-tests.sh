#!/bin/bash
# Run all tests across the workspace
# Usage: ./scripts/dev/run-tests.sh [--unit|--integration|--e2e|--watch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

TEST_TYPE=${1:--all}
WATCH=false

for arg in "$@"; do
    case $arg in
        --watch) WATCH=true ;;
    esac
done

echo "🧪 Running tests ($TEST_TYPE)..."

# Run Python tests
if [ -d "$PROJECT_ROOT/test" ]; then
    echo ""
    echo "🐍 Running Python tests..."
    cd "$PROJECT_ROOT"
    if [ "$WATCH" = true ]; then
        pytest test/ -v --watch
    else
        pytest test/ -v
    fi
fi

# Run JavaScript/TypeScript tests
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo ""
    echo "📦 Running JavaScript/TypeScript tests..."
    cd "$PROJECT_ROOT"
    if [ "$WATCH" = true ]; then
        npm test -- --watch
    else
        npm test
    fi
fi

# Run Flutter tests
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo ""
    echo "📱 Running Flutter tests..."
    cd "$PROJECT_ROOT/apps/mobile_app"
    flutter test
fi

# Run Admin Web tests
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo ""
    echo "🌐 Running Admin Web tests..."
    cd "$PROJECT_ROOT/apps/admin_web"
    npm test
fi

echo ""
echo "✨ All tests complete!"
