#!/bin/bash
set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
KEEP_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "📦 Creating database backup..."
/opt/homebrew/opt/postgresql@17/bin/pg_dump --clean --if-exists $DATABASE_URL > "$BACKUP_FILE"

# Verify backup
if [ -s "$BACKUP_FILE" ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  LINE_COUNT=$(wc -l < "$BACKUP_FILE" | tr -d ' ')

  echo "✅ Backup created successfully!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $FILE_SIZE"
  echo "   Lines: $LINE_COUNT"
else
  echo "❌ Backup failed - file is empty"
  exit 1
fi

# Clean up old backups (older than KEEP_DAYS)
echo ""
echo "🧹 Cleaning up old backups (older than ${KEEP_DAYS} days)..."
find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +${KEEP_DAYS} -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "   Backups remaining: $REMAINING"

echo ""
echo "✨ Backup complete!"
