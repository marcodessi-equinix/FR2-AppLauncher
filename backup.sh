#!/bin/bash
# AppLauncher Backup Script
# This script creates a compressed archive of the SQLite database and the uploads directory.

# Variables
BACKUP_DIR="./backups"
DATA_DIR="./data"
UPLOADS_DIR="./uploads"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate a timestamp for the filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/applauncher_backup_$TIMESTAMP.tar.gz"

echo "Starting AppLauncher backup..."

# Verify source directories exist
if [ ! -d "$DATA_DIR" ] || [ ! -d "$UPLOADS_DIR" ]; then
    echo "Error: Source directories ($DATA_DIR or $UPLOADS_DIR) not found. Are you running this from the root directory?"
    exit 1
fi

# Create the archive
if tar -czf "$BACKUP_FILE" "$DATA_DIR" "$UPLOADS_DIR"; then
    echo "Backup completed successfully!"
    echo "Saved to: $BACKUP_FILE"
    
    # Optional: Keep only the 7 most recent backups
    # ls -1t "$BACKUP_DIR"/applauncher_backup_*.tar.gz | tail -n +8 | xargs -r rm --
else
    echo "Error: Backup failed."
    exit 1
fi
