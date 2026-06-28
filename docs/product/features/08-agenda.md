# 08 — Agenda / Calendário · ✅ V1 implementada (2026-06-15)

## Visão
Cada **membro** gerencia a própria agenda: marca atendimentos com clientes e bloqueios de
indisponibilidade, sem sobreposição. Visões dia/semana/mês. Visibilidade por papel.

## Estado atual (ink-ops) — IMPLEMENTADO
- **Backend** `modules/calendar/**`: rota `orgs/:orgId/calendar` (`AuthGuard`+`OrgMembershipGuard`),
  use-cases list/create/update/delete, overlap por membro, exceções 409/422/403/404.
- **Schema** (migration `0007`): `calendar_events` ganhou `type` (`calendar_event_type`:
  appointment|unavailability), `assigned_to` NOT NULL + FK `users`, `created_by` FK `users`.
  Migration `0008`: `status` (`calendar_event_status`: `scheduled|canceled`, default `scheduled`)
  + `reminder_sent_at` (idempotência do lembrete de agenda — spec 14).
- **Frontend** `features/agenda/**` + `[orgSlug]/schedule.tsx`: context (view/range), visões
  custom CSS-grid (Semana/Mês/Dia), `EventForm` (Sheet), filtro de membro (owner), modo leitura.
- **Integração externa**: placeholder em `/dashboard/preferences` (Google/Outlook/Apple — em breve).

## Legado a portar (ink-house-studio)
`calendar_events(employee_id, created_by, title, description, start_date, end_date, all_day)`.
Frontend rico: visões **dia / semana / mês**, modal de evento, context de calendário
(`contexts/calendar`), componentes `calendar-*`. Eventos vinculados a um **funcionário**.

## Decisões das reuniões
- Tudo por **org** (eventos isolados); evento ligado a **funcionário**.
- **Pré-cadastro** de cliente (nome + telefone) para permitir automações de **confirmação de
  agenda** antes do atendimento (spec 03/14).
- **Integração Google Calendar** (futuro): sincronizar compromissos; sincronização para
  funcionários conectados. Tecnicamente viável, mas **avaliar necessidade real** depois
  (atrás de feature flag — spec 13).
- Confirmações/lembretes automáticos dependem de **cron + mensageria** (spec 14, futuro).

## Comportamento (V1 implementado)
1. **Evento** por membro (`assigned_to` = users.id): `type` (appointment|unavailability),
   `customer_id?` (atendimento↔cliente), título, descrição?, `starts_at`, `ends_at`, `all_day`.
2. **Visões** dia/semana/mês (custom CSS-grid, sem lib).
3. **Permissões:** owner=admin vê todos e filtra por membro; employee vê só os seus. **Ninguém
   cria/edita evento de outro** — owner abre eventos alheios em **modo leitura**.
4. **Sobreposição** proibida por membro (409 `CALENDAR_EVENT_OVERLAP`). `ends_at > starts_at`
   (exceto all_day) → 422. Editar/excluir de terceiro → 403.
5. **Status** `scheduled|canceled` (mínimo): só o dono cancela/reativa (ação no `EventForm`);
   eventos cancelados renderizam **esmaecidos/riscados** nas visões. Cancelar não cria serviço.
6. **Lembrete de agenda**: appointment `scheduled` nas próximas ~24h gera notificação (in-app +
   e-mail) via cron interno — detalhes na spec 14.

## Regras de negócio
- Evento sempre de uma org; `assigned_to` é o membro dono (forçado = usuário atual na criação).
- `ends_at > starts_at` (exceto all_day); sem sobreposição por membro.
- Integração externa **por usuário**, opt-in, fase futura (não bloqueia o nativo).

## Pendências / próximos passos
- **Status estendido** (confirmado/realizado) + relação com serviço realizado/caixa
  (V1 entregou só `scheduled|canceled`).
- **Pré-cadastro inline** de cliente no form de atendimento (hoje seleciona cliente existente).
- **Notificações** (lembrete de horário; aviso ao admin quando funcionário sinaliza indisponibilidade) — depende de cron + mensageria (spec 14).
- **Integração externa** (Google/Outlook/Apple): OAuth + espelhamento bidirecional por usuário; tabela `calendar_connections` + colunas `external_source/external_id` no evento.

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §4](../reunioes/2026-revisao-funcionalidades-por-modulo.md#4-agenda).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **V1 = replicar a agenda do legado** (eventos de serviços futuros para gestão da equipe/maca);
  visão dia/semana/mês.
- 🔮 **Google Calendar**: sincronização **por usuário** (conecta o próprio Gmail), bidirecional;
  exige webhook/PoC e pode gerar custo → V2.
- 🔮 **Pré-cadastro (nome + telefone) ligado ao sinal** → agendamento + confirmação automática;
  depende de atendimento automático/IA e mensageria.
