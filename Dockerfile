FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini \
    && apk add --no-cache --virtual .build-deps python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && apk del .build-deps

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]