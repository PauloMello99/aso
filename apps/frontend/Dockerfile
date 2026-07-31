# syntax=docker/dockerfile:1
# Multi-stage build do frontend Next.js num monorepo Turborepo + pnpm.
# Mesmo padrão do backend (turbo prune): isola o subset do frontend, builda com
# deps completas e roda com `next start` sobre deps de produção.
#
# Build a partir da RAIZ do repo:
#   docker build -f apps/frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.exemplo.com -t ink-ops-frontend .
#
# IMPORTANTE: NEXT_PUBLIC_API_URL é inlinado no bundle em BUILD TIME — precisa
# estar presente no build (no Railway, é passado como variável do serviço).

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
RUN apk add --no-cache libc6-compat

# ── 1. Prune ────────────────────────────────────────────────────────────
FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@^2 prune frontend --docker

# ── 2. Build (deps completas) ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
# GATE DE CONFORMIDADE LEGAL (ADR-0018): bloqueia QUALQUER deploy (staging e production)
# enquanto os dados da pessoa juridica em features/legal/constants/entity.ts ainda forem
# placeholders `[PREENCHER: ...]`. Sem CNPJ/razao social/endereco/DPO reais, o site nao
# pode ir ao ar (identificacao do fornecedor — Decreto 7.962/2013 + CDC; encarregado —
# LGPD art. 41). Fica aqui, e nao no `pnpm build`, porque o Railway deploya por push na
# branch do ambiente e ignora o resultado do GitHub Actions: o build da imagem e o unico
# ponto que o deploy obrigatoriamente atravessa. Nao bloqueia dev nem merge em
# `development`. LEGAL_ENTITY foi preenchido em 2026-07-31 — o grep abaixo fica como
# guarda permanente contra regressao (ex.: reverter para placeholder por engano).
RUN if grep -q '\[PREENCHER' apps/frontend/src/features/legal/constants/entity.ts; then \
      echo "ERRO: LEGAL_ENTITY ainda contem placeholders [PREENCHER: ...]." >&2; \
      echo "Preencha razao social, CNPJ, endereco e encarregado/DPO em" >&2; \
      echo "apps/frontend/src/features/legal/constants/entity.ts antes de deployar." >&2; \
      exit 1; \
    fi
# NEXT_PUBLIC_* tem que existir no build (Next inlina no bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm turbo run build --filter=frontend

# ── 3. Runner (deps de produção + next start) ───────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --prod --frozen-lockfile
# artefato buildado + config (sem pasta public/ — o app não usa)
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/next.config.js ./apps/frontend/next.config.js
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app
USER nextjs
WORKDIR /app/apps/frontend
EXPOSE 3000
# Invoca o next direto (sem pnpm) — evita o pnpm tentar recriar node_modules /
# baixar o corepack em runtime. next start respeita a env PORT (Railway injeta).
CMD ["node_modules/.bin/next", "start"]
