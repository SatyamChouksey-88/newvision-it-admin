#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] Seeding (SEED_ON_START=true)..."
  if ! npm run seed; then
    if [ "${SEED_MODE}" = "bootstrap" ]; then
      echo "[entrypoint] FATAL: bootstrap seed failed. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ chars), or SEED_IF_EMPTY=true if users already exist."
      exit 1
    fi
    echo "[entrypoint] seed skipped/failed (data may already exist)"
  fi
fi

echo "[entrypoint] Starting: $*"
exec "$@"
