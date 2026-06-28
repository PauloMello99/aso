# Ink Ops V1 — Especificação Feature a Feature

> Documentação de **como cada feature deve se comportar** na V1, cruzando três fontes:
> **(1)** decisões das reuniões (ver `docs/product/requisitos-e-regras-de-negocio-v1.md`),
> **(2)** o que já existe hoje no ink-ops, e
> **(3)** o comportamento do projeto legado **ink-house-studio**
> (`C:\Users\Paulo\Documents\Repos\Pessoal\InkHouse\ink-house-studio`), de onde a maioria das
> features será **portada** (regras de negócio, não código).
>
> Última atualização: 2026-06-14.

## Como ler cada doc

Cada feature segue a mesma estrutura: **Visão · Estado atual (ink-ops) · Legado a portar ·
Decisões das reuniões · Comportamento alvo (V1) · Regras de negócio · Pendências**.

Legenda de status:
- ✅ **Implementado** — já existe no ink-ops (pode precisar de ajuste).
- 🟡 **Parcial** — começou, falta completar.
- ♻️ **A portar** — existe no legado, precisa ser reimplementado (multi-tenant, regras novas).
- 🆕 **Novo** — não existe no legado nem no ink-ops.

## Catálogo

| # | Feature | Status | Origem legada | Decisão-chave das reuniões |
|---|---|---|---|---|
| 01 | [Organizações & Multi-tenancy](01-organizacoes-e-multi-tenancy.md) | 🟡 Parcial | — (legado é single-studio) | Tudo é por org; admin global (Assessoria Ink) |
| 02 | [Autenticação, Usuários & Papéis](02-autenticacao-usuarios-papeis.md) | 🟡 Parcial | `users` (isAdmin/isEmployee) | usuário único multi-org; super_admin/owner/employee |
| 03 | [Clientes](03-clientes.md) | ✅ Implementado | `customers` | campos núcleo + Cidade; observações/anexos; créditos fora do core |
| 04 | [Origens de Cliente](04-origens-de-cliente.md) | ♻️ A portar | `customer_origins` (texto livre) | **categorias fixas** para relatórios cross-org |
| 05 | [Serviços & Tipos de Serviço](05-servicos-e-tipos.md) | ♻️ A portar | `services` + `service_types` | tipos configuráveis por org; consome estoque; gera transação |
| 06 | [Materiais & Estoque](06-materiais-e-estoque.md) | ✅ Implementado | `materials` (amount int) | estoque realista (descartável vs parcial); ligação com serviço |
| 07 | [Caixa & Financeiro](07-caixa-e-financeiro.md) | ♻️ A portar | `transactions` (bank/cash) | **taxa de cartão → líquido no caixa**; transações append-only |
| 08 | [Agenda / Calendário](08-agenda.md) | ♻️ A portar | `calendar_events` | por org/funcionário; futuro: Google Calendar |
| 09 | [Relatórios](09-relatorios.md) | 🆕 Novo | charts pontuais | módulo segmentado (serviços/funcionários/clientes/financeiro) |
| 10 | [Dashboard](10-dashboard.md) | 🆕 Novo | gráfico de saldo | dashboard do administrador; futuro por funcionário |
| 11 | [Billing & Assinatura](11-billing-assinatura.md) | 🆕 Novo | — | Stripe, 4 configs, grace period |
| 12 | [Auditoria](12-auditoria.md) | 🟡 Parcial (schema) | — | quem/o quê/quando/org/alterações |
| 13 | [Feature Flags](13-feature-flags.md) | 🆕 Novo (ADR-0009) | — | liberar recursos por viabilidade; global pelo super_admin |
| 14 | [Notificações & Mensageria](14-notificacoes.md) | 🆕 Futuro | — | atrás de feature flag; custo em escala |

## Schema do legado (referência rápida)

Tabelas do `ink-house-studio` (single-studio, sem `org_id`):
`users` (admin+employee via flags), `customers` (com `credits` + `origin_id`),
`customer_origins` (description), `materials` (`amount` int, `category` enum),
`service_materials` (material↔serviço, amount), `services` (customer/employee, `amount`,
`type`, `payment_type`), `transactions` (income/outcome, `bank_balance`+`cash_balance`),
`calendar_events`.

Enums legados: `Gender(m/f/o)`, `MaterialCategory(tattoo/body_piercing/general)`,
`ServiceType(tattoo/body_piercing)`, `PaymentType(bank_transaction/cash/credits)`,
`TransactionType(income/outcome)`.

> **Fluxo central do legado (criar serviço):** valida cliente/funcionário ativos → valida
> créditos (se pgto em créditos) → valida e **baixa estoque** → grava `service_materials` →
> cria **transação de income** atualizando `bank_balance`/`cash_balance` → credita **10% de
> cashback** em `credits` do cliente. Esse encadeamento é a base das specs 05/06/07.
