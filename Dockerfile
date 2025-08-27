# Build de produção para Next.js 14
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Garante ambiente de dev para Next / PostCSS
ENV NODE_ENV=development

# Dependências de build para bcrypt e OpenSSL para Prisma
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    && rm -rf /var/lib/apt/lists/*

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

# Copia código (pula build para desenvolvimento)
COPY . .
# RUN yarn build

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]

