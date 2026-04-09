#!/bin/bash
# AppLauncher volume restore script.
# Usage: ./restore.sh [--yes] <path_to_backup.tar.gz>

set -euo pipefail

STACK_NAME="applauncher"
DATA_VOLUME="${STACK_NAME}_applauncher-data"
UPLOADS_VOLUME="${STACK_NAME}_applauncher-uploads"

COMPOSE_CMD=()
CONTAINER_BIN=""
ASSUME_YES="false"

detect_runtime() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        CONTAINER_BIN="docker"
        COMPOSE_CMD=(docker compose)
        return
    fi

    if command -v podman >/dev/null 2>&1; then
        CONTAINER_BIN="podman"
        if command -v podman-compose >/dev/null 2>&1; then
            COMPOSE_CMD=(podman-compose)
        else
            COMPOSE_CMD=(podman compose)
        fi
        return
    fi

    echo "Error: Neither Docker nor Podman is available."
    exit 1
}

ensure_volume() {
    local volume_name="$1"
    "$CONTAINER_BIN" volume create "$volume_name" >/dev/null
}

if [ "${1:-}" = "--yes" ]; then
    ASSUME_YES="true"
    shift
fi

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 [--yes] <path_to_backup.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

if [ "$ASSUME_YES" != "true" ]; then
    echo "Warning: This will overwrite the AppLauncher Docker/Podman volumes."
    read -r -p "Are you sure you want to proceed? (y/N) " REPLY
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "Restore aborted."
        exit 1
    fi
fi

detect_runtime

echo "Stopping AppLauncher containers..."
"${COMPOSE_CMD[@]}" down >/dev/null 2>&1 || true

ensure_volume "$DATA_VOLUME"
ensure_volume "$UPLOADS_VOLUME"

BACKUP_DIR=$(cd "$(dirname "$BACKUP_FILE")" && pwd)
BACKUP_BASENAME=$(basename "$BACKUP_FILE")

echo "Restoring volumes from ${BACKUP_FILE}..."
"$CONTAINER_BIN" run --rm \
    -v "${DATA_VOLUME}:/restore/data" \
    -v "${UPLOADS_VOLUME}:/restore/uploads" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine:3.20 \
    sh -c "rm -rf /restore/data/* /restore/uploads/* && tar -xzf /backup/${BACKUP_BASENAME} -C /restore"

echo "Restore completed successfully."
echo "You can now start the application again with the compose command for your chosen deployment mode."
