#!/usr/bin/env bash
set -euo pipefail

echo "=== Supabase Replay Check ==="
echo "1/5  Stopping any running instance…"
supabase stop --no-backup || true

echo "2/5  Starting local Supabase…"
supabase start --ignore-health-check

echo "3/5  Resetting database (replaying all migrations from zero)…"
supabase db reset

echo "4/5  Listing applied migrations…"
supabase migration list --local

echo "5/5  Checking for schema drift…"
DRIFT=$(supabase db diff --use-migra 2>&1 || true)
if [ -n "$DRIFT" ] && [ "$DRIFT" != "No changes found" ]; then
  echo "⚠️  Schema drift detected:"
  echo "$DRIFT"
else
  echo "✅  No schema drift."
fi

echo ""
echo "=== Replay Check Complete ==="
