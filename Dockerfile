# Build de produção para Next.js 14
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Instala dependências
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Prisma (se usado pelo app)
COPY prisma ./prisma
RUN npx prisma generate || true

# Em produção, aplica migrations automaticamente na inicialização do container
# (pode ser desativado via env APPLY_MIGRATIONS=false)
ENV APPLY_MIGRATIONS=true

# Script de entrypoint para rodar migrate deploy uma única vez e iniciar o app
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copia código e builda
COPY . .
RUN yarn build

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]

