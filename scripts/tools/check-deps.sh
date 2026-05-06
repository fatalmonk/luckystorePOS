#!/bin/bash
# Check for outdated dependencies across the workspace
# Usage: ./scripts/tools/check-deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

echo "📦 Checking for outdated dependencies..."

# Check Python dependencies
if [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/setup.py" ]; then
    echo ""
    echo "🐍 Python dependencies:"
    pip list --outdated 2>/dev/null || echo "  No outdated packages found"
fi

# Check Node dependencies
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo ""
    echo "📦 Root Node dependencies:"
    npm outdated 2>/dev/null || echo "  No outdated packages found"
fi

# Check Admin Web dependencies
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo ""
    echo "🌐 Admin Web dependencies:"
    cd "$PROJECT_ROOT/apps/admin_web"
    npm outdated 2>/dev/null || echo "  No outdated packages found"
fi

# Check Mobile App dependencies
if [ -d "$PROJECT_ROOT/apps/mobile_app" ]; then
    echo ""
    echo "📱 Mobile App dependencies:"
    cd "$PROJECT_ROOT/apps/mobile_app"
    flutter pub outdated
fi

# Check Scraper dependencies
if [ -d "$PROJECT_ROOT/apps/scraper" ]; then
    echo ""
    echo "🔍 Scraper dependencies:"
    cd "$PROJECT_ROOT/apps/scraper"
    npm outdated 2>/dev/null || echo "  No outdated packages found"
fi

echo ""
echo "✨ Dependency check complete!"
