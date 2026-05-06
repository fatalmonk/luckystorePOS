#!/bin/bash
# Backup Supabase database
# Usage: ./scripts/db/backup.sh [database_name] [output_path]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)

DB_NAME=${1:-lucky_store}
OUTPUT_PATH=${2:-"$PROJECT_ROOT/backups"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$OUTPUT_PATH/${DB_NAME}_backup_${TIMESTAMP}.sql"

echo "💾 Backing up database: $DB_NAME"
echo "📁 Output: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$OUTPUT_PATH"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Perform backup
supabase db dump -f "$BACKUP_FILE" --db-url "$DATABASE_URL"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup complete: $BACKUP_FILE"
echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
cd "$OUTPUT_PATH"
ls -t ${DB_NAME}_backup_*.sql.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "✨ Backup process complete!"
