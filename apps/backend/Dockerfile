# syntax=docker/dockerfile:1
# Multi-stage build do backend NestJS num monorepo Turborepo + pnpm.
# Padrão "turbo prune --docker": isola o subset mínimo do workspace para o
# backend, builda com deps completas e roda com node_modules de produção
# instalado do zero (mais confiável que copiar a store do pnpm entre stages).
#
# Build a partir da RAIZ do repo:
#   docker build -f apps/backend/Dockerfile -t ink-ops-backend .

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# CI=true torna o pnpm não-interativo (evita prompt de purge de node_modules)
ENV CI=true
RUN corepack enable
# libc compat p/ binários nativos (pg etc.) em alpine
RUN apk add --no-cache libc6-compat

# ── 1. Prune: gera out/json (manifests + lockfile) e out/full (código) ──
FROM base AS pruner
WORKDIR /app
COPY . .
# dlx roda o turbo sem precisar de bin global no PATH
RUN pnpm dlx turbo@^2 prune backend --docker

# ── 2. Build (deps completas) ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN pnpm turbo run build --filter=backend

# ── 3. Runner (deps de produção instaladas do zero) ─────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# instala SÓ deps de produção a partir dos manifests podados
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --prod --frozen-lockfile
# artefato compilado + migrações + entrypoint
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/drizzle ./apps/backend/drizzle
COPY --from=builder /app/apps/backend/entrypoint.sh ./apps/backend/entrypoint.sh
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs \
  && chown -R nestjs:nodejs /app
USER nestjs
# o migrator resolve drizzle/migrations via process.cwd(); o app roda daqui
WORKDIR /app/apps/backend
EXPOSE 3001
ENTRYPOINT ["sh", "entrypoint.sh"]
