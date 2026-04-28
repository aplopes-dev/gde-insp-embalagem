FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3004

CMD ["npm", "run", "start", "--", "-p", "3004"]
