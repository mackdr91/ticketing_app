#!/bin/sh
# Author: Domonick Mack
# Date: 2026-11-15
# Description: Container entrypoint script that syncs Prisma schema, runs idempotent seed, and starts the server.

set -e

echo "[PulseDesk] Synchronizing PostgreSQL schema with Prisma..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

echo "[PulseDesk] Running idempotent database seed..."
./node_modules/.bin/tsx prisma/seed.ts

echo "[PulseDesk] Starting Next.js standalone production server on port ${PORT:-3000}..."
exec node server.js
