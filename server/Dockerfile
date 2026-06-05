FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup -S nexchat && adduser -S nexchat -G nexchat

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

FROM base AS builder
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY src ./src

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./
RUN mkdir -p logs && chown -R nexchat:nexchat /app

USER nexchat
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/index.js"]
