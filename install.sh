#!/bin/bash

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
DEFAULT_PROXY_NETWORK="nginx-proxy-manager_default"

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

echo ""
echo "${BOLD}======================================================"
echo "  FR2 AppLauncher - Installations-Skript"
echo "======================================================${RESET}"
echo ""

echo "${BOLD}[1/4] Voraussetzungen pruefen...${RESET}"
if ! command -v podman >/dev/null 2>&1; then
    echo "${RED}FEHLER: 'podman' wurde nicht gefunden.${RESET}"
    echo "  Installation: https://podman.io/docs/installation"
    exit 1
fi

if ! command -v podman-compose >/dev/null 2>&1 && ! podman compose version >/dev/null 2>&1; then
    echo "${RED}FEHLER: 'podman-compose' oder 'podman compose' wurde nicht gefunden.${RESET}"
    exit 1
fi
echo "${GREEN}✓ Podman gefunden: $(podman --version)${RESET}"

echo ""
echo "${BOLD}[2/4] .env-Datei einrichten...${RESET}"
if [ -f ".env" ]; then
    echo "${YELLOW}ℹ  .env existiert bereits und wird weiterverwendet.${RESET}"
else
    read -r -p "  Frontend-Port [9020]: " FRONTEND_PORT
    FRONTEND_PORT="${FRONTEND_PORT:-9020}"

    read -r -p "  Proxy-Netzwerk [${DEFAULT_PROXY_NETWORK}]: " PROXY_NETWORK
    PROXY_NETWORK="${PROXY_NETWORK:-$DEFAULT_PROXY_NETWORK}"

    read -r -p "  Admin-Passwort festlegen (Enter fuer zufaelliges Passwort): " ADMIN_PASS
    if [ -z "$ADMIN_PASS" ]; then
        ADMIN_PASS=$(generate_password)
        echo "  Generiertes Admin-Passwort: ${ADMIN_PASS}"
    fi

    JWT_SECRET=$(generate_secret)
    HOST_NAME=$(hostname 2>/dev/null || echo "localhost")

    cat > .env <<EOF
PORT=3000
FRONTEND_PORT=${FRONTEND_PORT}
DATABASE_PATH=/app/data/applauncher.db
FRONTEND_URL=
COOKIE_SECURE=false
ALLOW_INSECURE_DEFAULTS=false
PROXY_NETWORK=${PROXY_NETWORK}
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASS}
EOF

    echo "${GREEN}✓ .env wurde erstellt.${RESET}"
    echo "${GREEN}  Frontend wird auf http://${HOST_NAME}:${FRONTEND_PORT} erreichbar sein.${RESET}"
fi

echo ""
echo "${BOLD}[3/4] Datenverzeichnisse vorbereiten...${RESET}"
mkdir -p data uploads/icons
touch uploads/icons/.gitkeep
echo "${GREEN}✓ Verzeichnisse 'data/' und 'uploads/icons/' bereit${RESET}"

PROXY_NETWORK=$(grep '^PROXY_NETWORK=' .env | cut -d= -f2)
PROXY_NETWORK="${PROXY_NETWORK:-$DEFAULT_PROXY_NETWORK}"

echo ""
echo "${BOLD}[3a/4] Proxy-Netzwerk pruefen...${RESET}"
if podman network exists "$PROXY_NETWORK" >/dev/null 2>&1; then
    echo "${GREEN}✓ Netzwerk '$PROXY_NETWORK' gefunden${RESET}"
else
    echo "${YELLOW}ℹ  Netzwerk '$PROXY_NETWORK' existiert noch nicht und wird erstellt...${RESET}"
    podman network create "$PROXY_NETWORK" >/dev/null
    echo "${GREEN}✓ Netzwerk '$PROXY_NETWORK' erstellt${RESET}"
fi

echo ""
echo "${BOLD}[4/4] Container bauen und starten...${RESET}"
if command -v podman-compose >/dev/null 2>&1; then
    podman-compose up -d --build
else
    podman compose up -d --build
fi

HOST_NAME=$(hostname 2>/dev/null || echo "localhost")
FRONTEND_PORT=$(grep '^FRONTEND_PORT=' .env | cut -d= -f2)

echo ""
echo "${GREEN}${BOLD}======================================================"
echo "  Installation abgeschlossen"
echo "======================================================${RESET}"
echo ""
echo "  Frontend: http://${HOST_NAME}:${FRONTEND_PORT:-9020}"
echo "  Backend:  nur intern im Compose-Netz"
echo "  Proxy-Netz: ${PROXY_NETWORK}"
echo ""
echo "  Update:   podman compose up -d --build"
echo "  Stoppen:  podman compose down"
echo "  Logs:     podman compose logs -f"
echo ""
