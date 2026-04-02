FROM node:20-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
COPY .erb ./.erb
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build:web

FROM caddy:2.8.4-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/release/app/dist/renderer /usr/share/caddy

EXPOSE 8080

