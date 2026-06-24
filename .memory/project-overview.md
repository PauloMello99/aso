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

## Direcionamentos das reuniões (jun/2026)

Consolidado em `docs/product/requisitos-e-regras-de-negocio-v1.md` (fontes: reuniões 04/06 e 11/06, Notion). Pontos que afetam decisões técnicas:

- **Comercial:** assinatura recorrente mensal via Stripe; trial + validação com estúdios convidados antes de escalar.
- **Plataforma:** multiempresa/multitenant + admin global (Assessoria Ink); ambientes separados **dev / homologação / produção**.
- **Infra assíncrona:** cron jobs/processamento assíncrono para mensagens, campanhas, confirmações e retenção.
- **Feature Flags:** liberar recursos (e-mail/SMS/notificações) só quando viáveis, controlados pelo super_admin (ver ADR-0009).
- **Refinamentos de domínio:** origem de cliente como categorias fixas (relatórios cross-org); taxas de cartão calculando líquido no caixa; estoque que reflete a realidade; relatórios segmentados; observações/anexos genéricos por cliente. Detalhe em [[domain-rules]].
- **Processo:** Notion é o hub de captura de conhecimento; documentação contínua alimenta roadmap e RAG.

### Especificação feature a feature

`docs/product/features/` documenta **como cada feature deve se comportar** na V1, cruzando
reuniões + estado atual do ink-ops + comportamento do legado `ink-house-studio` (a portar).
Começar por `docs/product/features/README.md` (catálogo com status por feature). Specs centrais:
clientes (03), origens (04), serviços+tipos (05), materiais/estoque (06), caixa/financeiro (07),
agenda (08); plataforma: orgs (01), auth/papéis (02), relatórios (09), dashboard (10),
billing (11), auditoria (12), feature flags (13), notificações (14).
