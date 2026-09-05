#!/bin/sh
set -e

echo "[topicpulse] applying database migrations..."
npx prisma migrate deploy

echo "[topicpulse] starting on port ${PORT:-3000}..."
exec node_modules/.bin/next start -p "${PORT:-3000}"
