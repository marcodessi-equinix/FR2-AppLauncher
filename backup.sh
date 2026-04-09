#!/bin/bash
# AppLauncher volume backup script.
# Creates a tar.gz archive from the Docker/Podman volumes used by the stack.

set -euo pipefail

STACK_NAME="applauncher"
DATA_VOLUME="${STACK_NAME}_applauncher-data"
UPLOADS_VOLUME="${STACK_NAME}_applauncher-uploads"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="applauncher_backup_${TIMESTAMP}.tar.gz"

COMPOSE_CMD=()
CONTAINER_BIN=""

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

require_volume() {
    local volume_name="$1"
    if ! "$CONTAINER_BIN" volume inspect "$volume_name" >/dev/null 2>&1; then
        echo "Error: Required volume '$volume_name' was not found."
        echo "Start the stack once before creating backups."
        exit 1
    fi
}

detect_runtime
mkdir -p "$BACKUP_DIR"
BACKUP_DIR_ABS=$(cd "$BACKUP_DIR" && pwd)

require_volume "$DATA_VOLUME"
require_volume "$UPLOADS_VOLUME"

echo "Creating backup from volumes:"
echo "  - $DATA_VOLUME"
echo "  - $UPLOADS_VOLUME"

"$CONTAINER_BIN" run --rm \
    -v "${DATA_VOLUME}:/source/data:ro" \
    -v "${UPLOADS_VOLUME}:/source/uploads:ro" \
    -v "${BACKUP_DIR_ABS}:/backup" \
    alpine:3.20 \
    sh -c "tar -czf /backup/${BACKUP_FILE} -C /source data uploads"

echo "Backup completed successfully."
echo "Saved to: ${BACKUP_DIR}/${BACKUP_FILE}"
