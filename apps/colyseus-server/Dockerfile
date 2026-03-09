# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-rules/package.json packages/shared-rules/
COPY apps/colyseus-server/package.json apps/colyseus-server/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-rules/ packages/shared-rules/
COPY apps/colyseus-server/ apps/colyseus-server/

RUN pnpm --filter @ddp/shared-types run build \
 && pnpm --filter @ddp/shared-rules run build \
 && pnpm --filter colyseus-server run build

# ── Run stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-rules/package.json packages/shared-rules/
COPY apps/colyseus-server/package.json apps/colyseus-server/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/
COPY --from=build /app/packages/shared-rules/dist packages/shared-rules/dist
COPY --from=build /app/packages/shared-rules/package.json packages/shared-rules/
COPY --from=build /app/apps/colyseus-server/dist apps/colyseus-server/dist

EXPOSE 2567
CMD ["node", "apps/colyseus-server/dist/index.js"]
