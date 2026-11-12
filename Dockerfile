FROM node:22.23.5-alpine@sha256:f4081a5ddded4f76ddd2ae8cc37b3d817926871c64b11b8f684be2a588a7792d

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY public ./public
COPY server ./server
COPY config ./config

ENV NODE_ENV=production
ENV PORT=53123
EXPOSE 53123

CMD ["node", "server/index.js"]
