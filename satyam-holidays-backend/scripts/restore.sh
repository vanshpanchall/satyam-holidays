#!/bin/bash
# MongoDB Restore Script for Satyam Holidays
# Usage: ./scripts/restore.sh <backup-file.tar.gz>

set -e

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

if ! command -v mongorestore >/dev/null 2>&1; then
  echo "mongorestore not found. Install MongoDB Database Tools first."
  exit 1
fi

if [ -z "$MONGODB_URI" ]; then
  echo "MONGODB_URI is not set. Aborting restore."
  exit 1
fi

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.tar.gz>"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Extracting backup: $BACKUP_FILE"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

DUMP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$DUMP_DIR" ]; then
  echo "Unable to locate extracted dump directory."
  exit 1
fi

echo "Restoring MongoDB from: $DUMP_DIR"
mongorestore --uri="$MONGODB_URI" --drop "$DUMP_DIR"

echo "Restore completed successfully at $(date)"
