#!/bin/bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"

./flutter/bin/flutter gen-l10n
./flutter/bin/flutter build web --release \
  "--dart-define=SUPABASE_URL=${SUPABASE_URL}" \
  "--dart-define=SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"
