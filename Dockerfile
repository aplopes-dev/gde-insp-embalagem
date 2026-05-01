FROM node:20-bookworm

# `lp` para /api/imprimir-pdf — o cliente CUPS no contentor precisa de aceder ao daemon CUPS
# do host (ex.: montar /var/run/cups/cups.sock) ou a CUPS_SERVER na rede.
RUN apt-get update \
  && apt-get install -y --no-install-recommends cups-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3004

CMD ["npm", "run", "start", "--", "-p", "3004"]
