#!/usr/bin/env sh
set -e

if [ "$APPLY_MIGRATIONS" = "true" ]; then
  echo "[ENTRYPOINT] Aplicando migrations Prisma (deploy)..."
  npx prisma migrate deploy || true
  echo "[ENTRYPOINT] Gerando client Prisma..."
  npx prisma generate || true
fi

yarn start

