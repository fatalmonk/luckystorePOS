#!/bin/bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"

# Resolve Flutter SDK from PATH or system installation
if command -v flutter >/dev/null 2>&1; then
  FLUTTER_BIN="flutter"
elif [ -x "$HOME/development/flutter/bin/flutter" ]; then
  FLUTTER_BIN="$HOME/development/flutter/bin/flutter"
else
  echo "Error: Flutter SDK not found in PATH or ~/development/flutter" >&2
  exit 1
fi

"$FLUTTER_BIN" gen-l10n
"$FLUTTER_BIN" build web --release \
  "--dart-define=SUPABASE_URL=${SUPABASE_URL}" \
  "--dart-define=SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"
