# 14 — Notificações & Mensageria · 🟡 V1 entregue (in-app + e-mail); canais extras atrás de flag

## Visão
Comunicação automática com clientes e operação: lembretes, agradecimentos, campanhas, alertas.

## Estado atual (ink-ops) — V1 entregue (2026-06-15)
**Núcleo reutilizável de notificações** (`modules/notifications/`), pensado para servir vários gatilhos
(agenda hoje; estoque/billing/campanhas depois):
- **`NotificationService.notify({ userId, orgId?, type, title, body?, data?, email? })`** (exportado;
  outros módulos injetam) → grava a notificação **in-app** e dispara **e-mail** (Resend) best-effort.
- **Canais V1**: **in-app** (sempre) + **e-mail via Resend** (gateado por `NOTIFICATIONS_EMAIL_ENABLED`
  + `RESEND_API_KEY`; sem chave → no-op logado, in-app continua). Porta `IEmailSender` pronta para
  plugar **SMS/WhatsApp** depois sem tocar nos gatilhos.
- **Inbox por usuário** `GET /me/notifications` (`{items, unread}`), `POST :id/read`, `POST read-all`
  (`AuthGuard`; resolve `authId→users.id`). Tabela `notifications` **sem RLS**, escopada por `user_id`
  no código via `DRIZZLE_ADMIN`.
- **Sininho no header** (`features/notifications/`): badge de não-lidas, lista com tempo relativo
  (date-fns ptBR), marcar como lida / marcar todas; polling a cada 30s.

**Gatilhos ligados no V1:**
1. **Lembrete de agenda** — appointment `scheduled` que começa nas próximas ~24h (idempotente via
   `reminder_sent_at`). Disparado por **cron interno**.
2. **Indisponibilidade de membro** — quando um membro cria um bloqueio, os **owners** da org são
   notificados (exceto o autor).

**Cron seguro (Railway):** `POST /internal/cron/agenda-reminders`, protegido por `CronSecretGuard`
(header `x-cron-secret` == env `CRON_SECRET`; sem Auth/Org guard → usa `DRIZZLE_ADMIN`). No Railway,
um **job agendado** (ex.: a cada 15min ou de hora em hora) faz um `POST` nesse endpoint com o header
do segredo. Estrutura permite somar outros jobs (billing grace, reativação) depois.

> **Adiado (decisão 2026-06-15):** o módulo completo de **Feature Flags** (spec 13 / ADR-0009). Por
> ora o e-mail é gateado por env; in-app sempre ligado. Quando houver mais canais/políticas de custo,
> migrar os gates para o módulo de flags.

## Legado a portar
**Nenhum** (eram funcionalidades "planejadas" na reunião 04/06, não implementadas).

## Decisões das reuniões
- Casos: **estoque baixo**, agradecimento pós-atendimento, campanhas promocionais, reativação
  de inativos, comunicados gerais, **confirmação de agenda**.
- **Preocupação principal: custo operacional em escala** → tudo atrás de **Feature Flags**
  (spec 13), desligado até validação comercial.
- Depende de **cron jobs / processamento assíncrono** (reunião 04/06).

## Comportamento alvo (futuro — direcional)
1. **Infra assíncrona:** fila/cron para disparos agendados e em massa (confirmações, campanhas).
2. **Canais** atrás de flags independentes: e-mail, SMS, WhatsApp (avaliar provedores/custo).
3. **Gatilhos:** eventos do domínio (estoque baixo, serviço concluído, agenda próxima) e
   agendados (campanhas, reativação por inatividade).
4. **Pré-cadastro** (nome + telefone, spec 03/08) habilita confirmação de agenda.

## Regras de negócio
- Nenhum disparo sem a flag do canal ligada (controle do super_admin).
- Respeitar consentimento/opt-out do cliente (a definir).

## Pendências
- Tudo: provedores, custo, modelo de templates, opt-out, infraestrutura de cron/fila.
- Não é V1 — entra quando houver validação comercial.

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §10](../reunioes/2026-revisao-funcionalidades-por-modulo.md#10-notificações--mensageria).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- 🟡 **In-app primeiro** (sino/dashboard) — entregue; externos adiados por **custo em escala**.
- ⏳ **Lembrete periódico de verificação de estoque** (config em dias por org + histórico + cron)
  e **alerta de estoque baixo** ao admin (spec 06) — gatilhos in-app antes de e-mail/celular.
- 🔮 Externos: agradecimento pós-atendimento, **confirmação de agenda** (depende de pré-cadastro,
  spec 08), reativação de inativos (ex.: 6 meses), campanhas em massa, IA de atendimento.
