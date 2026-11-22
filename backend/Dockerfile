FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate --config prisma7.config.ts
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --config prisma7.config.ts && npx ts-node --transpile-only prisma/seed.ts && node dist/server.js"]
