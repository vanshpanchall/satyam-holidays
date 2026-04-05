#!/bin/bash
# Rollback Script: restore from a specific backup or latest backup
# Usage:
#   ./scripts/rollback.sh                       # restore latest backup
#   ./scripts/rollback.sh ./backups/file.tar.gz # restore specific backup

set -e

BACKUP_DIR="./backups"
SELECTED_BACKUP="$1"

if [ -z "$SELECTED_BACKUP" ]; then
  SELECTED_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -n 1)
fi

if [ -z "$SELECTED_BACKUP" ] || [ ! -f "$SELECTED_BACKUP" ]; then
  echo "No backup file found. Provide a valid backup path."
  exit 1
fi

echo "Starting rollback using backup: $SELECTED_BACKUP"
./scripts/restore.sh "$SELECTED_BACKUP"

echo "Rollback completed. Validate API and admin login before resuming traffic."
