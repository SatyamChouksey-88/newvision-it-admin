#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] Seeding demo data (SEED_ON_START=true)..."
  npm run seed || echo "[entrypoint] seed skipped/failed (data may already exist)"
fi

echo "[entrypoint] Starting: $*"
exec "$@"
