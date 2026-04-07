#!/bin/bash
# AppLauncher Restore Script
# Usage: ./restore.sh <path_to_backup.tar.gz>

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DIR="." 

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "Warning: This will OVERWRITE current data/ and uploads/ directories."
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Restore aborted."
    exit 1
fi

echo "Stopping containers..."
docker compose down 2>/dev/null || podman compose down 2>/dev/null || podman-compose down 2>/dev/null || true

echo "Restoring from $BACKUP_FILE..."
if tar -xzf "$BACKUP_FILE" -C "$TARGET_DIR"; then
    echo "Restore completed successfully!"
    echo "You can now start the application with: docker compose up -d"
else
    echo "Error: Restore failed."
    exit 1
fi
