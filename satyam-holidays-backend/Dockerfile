FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chown -R appuser:nodejs /app
USER appuser
ENV NODE_ENV=production
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["node", "server.js"]
