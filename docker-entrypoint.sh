#!/usr/bin/env sh
set -e

if [ "$APPLY_MIGRATIONS" = "true" ]; then
  echo "[ENTRYPOINT] Aplicando migrations Prisma (deploy)..."
  npx prisma migrate deploy || true
  echo "[ENTRYPOINT] Executando seed Prisma..."
  npx prisma db seed || true
  echo "[ENTRYPOINT] Gerando client Prisma..."
  npx prisma generate || true
fi

# Garante ambiente de desenvolvimento para Next.js (necessário para loaders de CSS/PostCSS)
export NODE_ENV=development

yarn dev

