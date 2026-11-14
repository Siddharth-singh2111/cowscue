# syntax=docker/dockerfile:1.7
# Multi-stage build producing two small images from one codebase:
#   --target web     Next.js standalone server (stateless, horizontally scalable)
#   --target worker  BullMQ job consumer (dispatch, SLA escalation, notifications)

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_PUSHER_KEY
ARG NEXT_PUBLIC_PUSHER_CLUSTER
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Web tier ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 SERVICE_NAME=cowscue-web
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]

# ── Worker tier ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS worker
WORKDIR /app
ENV NODE_ENV=production SERVICE_NAME=cowscue-worker
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json tsconfig.json ./
COPY --chown=app:app src ./src
USER app
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001 || exit 1
CMD ["node", "--import", "tsx", "src/worker/index.ts"]
