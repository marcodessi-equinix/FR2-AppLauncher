#!/bin/sh
set -eu

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