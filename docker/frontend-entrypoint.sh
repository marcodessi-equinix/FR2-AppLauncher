#!/bin/sh
set -eu

# ── 1. Detect the container DNS resolver ────────────────────────────
#    Docker uses 127.0.0.11, Podman/aardvark-dns uses the network
#    gateway (e.g. 10.89.0.1).  We read the first nameserver from
#    /etc/resolv.conf so the nginx config works on BOTH runtimes.
RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null || true)
RESOLVER=${RESOLVER:-127.0.0.11}

echo "frontend-entrypoint: detected DNS resolver ${RESOLVER}"

# Replace the __RESOLVER__ placeholder in the nginx config.
sed -i "s/__RESOLVER__/${RESOLVER}/g" /etc/nginx/conf.d/default.conf

# ── 2. Generate runtime-config.js ───────────────────────────────────
if [ -f /app/build-metadata.env ]; then
  # shellcheck disable=SC1091
  . /app/build-metadata.env
fi

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

API_URL_VALUE=$(json_escape "${API_URL:-/api}")
BUILD_VERSION_VALUE=$(json_escape "${BUILD_VERSION:-${IMAGE_BUILD_VERSION:-unknown}}")
BUILD_DATE_VALUE=$(json_escape "${BUILD_DATE:-${IMAGE_BUILD_DATE:-unknown}}")
GIT_SHA_VALUE=$(json_escape "${GIT_SHA:-${IMAGE_GIT_SHA:-unknown}}")
BUILD_TIME_VALUE=$(json_escape "${BUILD_TIME:-${IMAGE_BUILD_TIME:-unknown}}")
BUILD_NUMBER_VALUE=$(json_escape "${BUILD_NUMBER:-${IMAGE_BUILD_NUMBER:-unknown}}")

cat > /app/dist/runtime-config.js <<EOF
window.RUNTIME_CONFIG = {
  API_URL: "$API_URL_VALUE",
  BUILD_VERSION: "$BUILD_VERSION_VALUE",
  BUILD_DATE: "$BUILD_DATE_VALUE",
  GIT_SHA: "$GIT_SHA_VALUE",
  BUILD_TIME: "$BUILD_TIME_VALUE",
  BUILD_NUMBER: "$BUILD_NUMBER_VALUE"
};
EOF

exec "$@"