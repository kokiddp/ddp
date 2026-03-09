# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/integration-api/package.json apps/integration-api/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types/ packages/shared-types/
COPY apps/integration-api/ apps/integration-api/

RUN pnpm --filter @ddp/shared-types run build \
 && pnpm --filter integration-api run build

# ── Run stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/integration-api/package.json apps/integration-api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/
COPY --from=build /app/apps/integration-api/dist apps/integration-api/dist

EXPOSE 3100
CMD ["node", "apps/integration-api/dist/index.js"]
