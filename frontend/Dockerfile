# Build the static app, then serve it with Caddy.

FROM node:24-alpine AS build
WORKDIR /app
# Same pnpm version as local development.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
