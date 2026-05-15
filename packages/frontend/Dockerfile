# syntax=docker/dockerfile:1.7
# Build the React app then serve it with a minimal Nginx image.
# Built from the monorepo root (see docker-compose.yml) so the workspace can be
# resolved.

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
# Vite reads VITE_* env vars at build time and inlines them in the bundle.
ARG VITE_BASE_PATH=/
ARG VITE_API_BASE_URL=/api
ARG VITE_DEADLINE_ISO
ENV VITE_BASE_PATH=$VITE_BASE_PATH \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DEADLINE_ISO=$VITE_DEADLINE_ISO
RUN pnpm --filter @hc/frontend build

FROM nginx:1.27-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
