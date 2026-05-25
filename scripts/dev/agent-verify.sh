#!/bin/bash
# Agent Verification Script
# Compliance check for AI agent session startup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ERRORS=0
WARNINGS=0

echo "================================"
echo "Agent Verification Check"
echo "================================"
echo ""

# Check required files exist
echo "Checking required context files..."

if [ -f "$PROJECT_ROOT/.ai/MASTER_RULES.md" ]; then
    echo "  ✓ MASTER_RULES.md"
else
    echo "  ✗ MASTER_RULES.md (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/.ai/AGENT_ONBOARDING.md" ]; then
    echo "  ✓ AGENT_ONBOARDING.md"
else
    echo "  ✗ AGENT_ONBOARDING.md (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/.ai/AI_TASKS.md" ]; then
    echo "  ✓ AI_TASKS.md"
else
    echo "  ✗ AI_TASKS.md (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$PROJECT_ROOT/.vibe/current/context.md" ]; then
    echo "  ✓ context.md"
else
    echo "  ✗ context.md (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check project structure
echo "Checking project structure..."
if [ -d "$PROJECT_ROOT/apps/admin_web" ]; then
    echo "  ✓ apps/admin_web"
else
    echo "  ✗ apps/admin_web (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "$PROJECT_ROOT/apps/customer_storefront" ]; then
    echo "  ✓ apps/customer_storefront"
else
    echo "  ⚠ apps/customer_storefront (optional)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "  ✓ package.json"
else
    echo "  ✗ package.json (MISSING)"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check git status
echo "Checking git status..."
cd "$PROJECT_ROOT"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "  Current branch: $BRANCH"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "  ⚠ Uncommitted changes detected"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✓ Working tree clean"
fi

echo ""

# Check node_modules
echo "Checking dependencies..."
if [ -d "$PROJECT_ROOT/node_modules" ]; then
    echo "  ✓ node_modules exists"
else
    echo "  ✗ node_modules missing (run npm install)"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Summary
echo "================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✓ All checks passed"
    echo "================================"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠ $WARNINGS warning(s)"
    echo "================================"
    exit 0
else
    echo "✗ $ERRORS error(s), $WARNINGS warning(s)"
    echo "================================"
    exit 1
fi
