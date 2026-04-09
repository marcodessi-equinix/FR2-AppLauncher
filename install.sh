#!/bin/bash
# AppLauncher - interactive installation script.
# Works with Docker Compose or Podman Compose.

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")

COMPOSE_CMD=()

require_env_value() {
    local key="$1"
    local value
    value=$(grep -E "^${key}=" .env 2>/dev/null | head -n1 | cut -d= -f2- || true)
    if [ -z "$value" ]; then
        echo "${RED}ERROR: '${key}' is missing or empty in .env.${RESET}"
        exit 1
    fi
}

generate_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    else
        tr -dc 'a-f0-9' < /dev/urandom | head -c 64
    fi
}

generate_password() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 18 | tr -d '=+/' | cut -c1-16
    else
        tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16
    fi
}

detect_compose() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD=(docker compose)
        echo "${GREEN}Found: docker compose $(docker compose version --short 2>/dev/null)${RESET}"
        return
    fi

    if command -v podman >/dev/null 2>&1; then
        if command -v podman-compose >/dev/null 2>&1; then
            COMPOSE_CMD=(podman-compose)
            echo "${GREEN}Found: podman-compose${RESET}"
            return
        fi

        if podman compose version >/dev/null 2>&1; then
            COMPOSE_CMD=(podman compose)
            echo "${GREEN}Found: podman compose${RESET}"
            return
        fi
    fi

    echo "${RED}ERROR: Neither 'docker compose' nor 'podman-compose' found.${RESET}"
    echo "  Install Docker: https://docs.docker.com/engine/install/"
    echo "  Install Podman: https://podman.io/docs/installation"
    exit 1
}

echo ""
echo "${BOLD}======================================================"
echo "  AppLauncher - Installation"
echo "======================================================${RESET}"
echo ""

echo "${BOLD}[1/3] Checking prerequisites...${RESET}"
detect_compose

echo ""
echo "${BOLD}[2/3] Setting up .env file...${RESET}"
if [ -f ".env" ]; then
    echo "${YELLOW}.env already exists - reusing it.${RESET}"
    require_env_value "JWT_SECRET"
    require_env_value "ADMIN_PASSWORD"
else
    read -r -p "  Application port [9020]: " APP_PORT
    APP_PORT="${APP_PORT:-9020}"

    read -r -p "  Admin password (Enter for random): " ADMIN_PASS
    if [ -z "$ADMIN_PASS" ]; then
        ADMIN_PASS=$(generate_password)
        echo "  Generated admin password: ${ADMIN_PASS}"
    fi

    JWT_SECRET=$(generate_secret)

    cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASS}
APP_PORT=${APP_PORT}
COOKIE_SECURE=auto
FRONTEND_URL=
EOF

    echo "${GREEN}.env created.${RESET}"
fi

echo ""
echo "${BOLD}[3/3] Building and starting containers...${RESET}"
"${COMPOSE_CMD[@]}" up -d --build

HOST_NAME=$(hostname 2>/dev/null || echo "localhost")
APP_PORT=$(grep '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || echo "9020")
COMPOSE_DISPLAY="${COMPOSE_CMD[*]}"

echo ""
echo "${GREEN}${BOLD}======================================================"
echo "  Installation complete!"
echo "======================================================${RESET}"
echo ""
echo "  App:     http://${HOST_NAME}:${APP_PORT:-9020}"
echo ""
echo "  Update:  ${COMPOSE_DISPLAY} up -d --build"
echo "  Stop:    ${COMPOSE_DISPLAY} down"
echo "  Logs:    ${COMPOSE_DISPLAY} logs -f"
echo ""
echo "  Proxy mode:"
echo "           cp .env.proxy.example .env"
echo "           ${COMPOSE_DISPLAY} -f docker-compose.proxy.yml up -d --build"
echo ""
