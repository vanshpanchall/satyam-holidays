#!/bin/bash
# MongoDB Automated Backup Script for Satyam Holidays
# Usage: ./scripts/backup.sh
# Schedule with cron: 0 2 * * * /path/to/scripts/backup.sh

set -e

# Load env vars
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/satyam_holidays_${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "Starting MongoDB backup at $(date)"

# Use mongodump with your Atlas connection string
mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH"

# Compress the backup
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "satyam_holidays_${TIMESTAMP}"
rm -rf "$BACKUP_PATH"

# Keep only last 7 backups
ls -t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "Backup completed: ${BACKUP_PATH}.tar.gz"
echo "Backup size: $(du -sh "${BACKUP_PATH}.tar.gz" | cut -f1)"
