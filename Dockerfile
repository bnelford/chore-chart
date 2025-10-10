FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY public ./public
COPY server ./server
COPY config ./config

ENV NODE_ENV=production
ENV PORT=53123
EXPOSE 53123

CMD ["node", "server/index.js"]
