# Etapa 1: Construção da aplicação
FROM node:18-alpine AS builder

# Instalar tzdata para configurar o fuso horário
RUN apk add --no-cache tzdata

# Definir o fuso horário para São Paulo
ENV TZ=America/Sao_Paulo

# Definir o diretório de trabalho
WORKDIR /app

# Aceitar a variável de ambiente NODE_ENV vinda do docker-compose
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# Copiar os arquivos de dependências
COPY package.json yarn.lock ./

# Instalar as dependências
# Se estiver em ambiente de desenvolvimento, instale todas as dependências
# Caso contrário, instale apenas as dependências de produção
RUN if [ "$NODE_ENV" = "development" ]; then yarn install; else yarn install --frozen-lockfile --production; fi

# Copiar o restante do código da aplicação
COPY . .

# Gerar o Prisma Client (se estiver usando o Prisma)
RUN npx prisma generate

# Construir a aplicação Next.js
RUN yarn build

# Etapa 2: Configuração da imagem de produção
FROM node:18-alpine

# Instalar tzdata para configurar o fuso horário
RUN apk add --no-cache tzdata

# Definir o fuso horário para São Paulo
ENV TZ=America/Sao_Paulo

# Definir o diretório de trabalho
WORKDIR /app

# Aceitar a variável de ambiente NODE_ENV vinda do docker-compose
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# Copiar as dependências de produção
COPY package.json yarn.lock ./

# Instalar apenas as dependências de produção
RUN if [ "$NODE_ENV" = "development" ]; then yarn install; else yarn install --frozen-lockfile --production; fi

# Copiar a pasta de build da etapa anterior
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Agora, copie os arquivos de código da aplicação necessários para execução
COPY --from=builder /app/src ./src
# Expor a porta que a aplicação irá rodar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["yarn", "start"]