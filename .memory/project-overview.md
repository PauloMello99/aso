---
name: project-overview
description: Visão geral, objetivo e premissas do ink-ops (v2 do Ink House Studio)
metadata:
  type: project
---

## O que é

O **Ink Ops** é uma plataforma SaaS multi-tenant de assessoria para estúdios de tatuagem. Reescrita completa do Ink House Studio (v1), transformada em white label. O produto principal na V1 é o sistema de gestão de estúdio. Futuramente, outros produtos serão adicionados (audiovisual, tráfego pago, gestão de redes sociais).

A empresa por trás da plataforma é a **Ink House**, cujos sócios (Ruan e João Pedro) também serão super admins da plataforma e terão uma organização própria dentro dela.

**Why:** Mercado de estúdios de tatuagem carece de ferramentas administrativas adequadas. A Ink House já tem um sistema funcional (v1) e quer monetizá-lo como produto SaaS.

**How to apply:** Toda decisão técnica deve considerar multi-tenancy desde o início. Nenhum dado pode ser "global" sem `org_id`. O código da v1 não é reaproveitado — apenas as regras de negócio.

## Referência da v1

Projeto antigo em `C:\Users\Paulo\Documents\Repos\Pessoal\InkHouse\ink-house-studio` — Next.js 14 monolítico com Supabase. Serve como referência de regras de negócio, não de código.

## Estado atual do monorepo

- `apps/backend` — NestJS API (health check, estrutura base)
- `apps/frontend` — Next.js (pages router)
- `packages/` — eslint-config, typescript-config, ui (shadcn/Radix), utils (cn), types (placeholder Supabase)
