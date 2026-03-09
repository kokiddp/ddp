# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# Copy workspace config first for better layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-rules/package.json packages/shared-rules/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-rules/ packages/shared-rules/
COPY apps/web/ apps/web/

# Build shared packages, then web client
RUN pnpm --filter @ddp/shared-types run build \
 && pnpm --filter @ddp/shared-rules run build \
 && pnpm --filter web run build

# ── Serve stage ──────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
