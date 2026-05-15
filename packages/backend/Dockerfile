# syntax=docker/dockerfile:1.7
# Single-stage build. We don't compile TypeScript — `tsx` transpiles at runtime,
# which avoids the monorepo rootDir headaches and keeps the image simple.
# Cold start cost is ~50ms, irrelevant for a long-running server.

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && addgroup -S app && adduser -S app -G app

# Install dependencies first for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source for both workspace packages. `@hc/shared` is resolved through
# the workspace symlink in node_modules.
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

ENV NODE_ENV=production
USER app
EXPOSE 3001
WORKDIR /app/packages/backend
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/api/health >/dev/null || exit 1
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
