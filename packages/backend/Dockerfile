# syntax=docker/dockerfile:1.7
# Multi-stage build: pnpm install with workspace context, then compile TS, then
# ship a slim runtime image with only the prod deps.

FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile || pnpm install

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
RUN pnpm --filter @hc/backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && addgroup -S app && adduser -S app -G app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json
USER app
EXPOSE 3001
WORKDIR /app/packages/backend
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/api/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
