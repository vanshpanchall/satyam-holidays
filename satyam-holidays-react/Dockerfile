FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_BASE
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
RUN npm run build

FROM caddy:2.7.6-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /usr/share/caddy
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:80/ || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
