FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma prisma.config.ts ./
ARG DATABASE_URL
RUN DATABASE_URL=$DATABASE_URL npm ci && npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache chromium
ENV CHROME_PATH=/usr/bin/chromium-browser

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/schema.prisma ./schema.prisma
COPY --from=builder /app/prisma.config.ts ./

RUN npm ci --omit=dev --ignore-scripts && mkdir -p uploads && chown -R nestjs:nodejs /app

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY docker/start.sh ./start.sh
RUN chmod +x start.sh

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["sh", "start.sh"]
