#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "============================================"
echo "   Lucky Store POS — Full Local Check"
echo "============================================"
echo ""

# 1. Secret scan
echo ">>> Step 1/5: Secret Scan"
node scripts/secret_scan.js
echo "✅  Secret scan passed."
echo ""

# 2. Supabase replay
echo ">>> Step 2/5: Supabase Replay Check"
./scripts/dev/replay-check.sh
echo ""

# 3. Supabase tests
echo ">>> Step 3/5: Supabase RPC Tests"
cd supabase/tests
npm install --silent
npm test
echo "✅  Supabase tests passed."
cd "$REPO_ROOT"
echo ""

# 4. Admin web
echo ">>> Step 4/5: Admin Web (lint + build)"
cd apps/admin_web
npm install --silent
npm run lint
npm run build
echo "✅  Admin web lint + build passed."
cd "$REPO_ROOT"
echo ""

# 5. Flutter
echo ">>> Step 5/5: Flutter (analyze + test)"
cd apps/mobile_app
flutter pub get
flutter analyze
flutter test
echo "✅  Flutter analyze + test passed."
cd "$REPO_ROOT"
echo ""

echo "============================================"
echo "   ✅  All checks passed!"
echo "============================================"
