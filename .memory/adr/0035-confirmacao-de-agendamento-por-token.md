# ADR-0035 — Confirmação de agendamento pelo cliente por link com token (hash), status separado

**Status:** Aceito
**Data:** 2026-10-08

## Contexto

Reunião de **2026-10-07** (Bloco B do backlog): o cliente agenda, o tatuador esquece de
confirmar, o cliente não aparece. Decisões do usuário nesta rodada: o tipo `appointment`
(Atendimento) é **reaproveitado** (nenhum valor novo em `calendar_event_type`); resposta do
cliente por **link/botão** (sem Resend inbound); "Não poderei ir" **só sinaliza**; link com
**hash** no banco, válido até o início do evento e mutável; evento criado com <24h só envia a
confirmação; notificação in-app só ao `assigned_to`; reagendar/trocar e-mail reinicia o ciclo.

## Decisão

- **Colunas em `calendar_events`** (migration `0086`): `customer_email` (texto livre, opcional),
  `confirmation_status` (`pending|confirmed|canceled_by_customer`, enum próprio),
  `confirmation_token_hash` (sha256 hex; único parcial), `confirmation_requested_at`,
  `confirmation_sent_at`, `confirmation_responded_at`, `customer_reminder_sent_at`. CHECK de
  consistência (status/hash/e-mail/requested_at). `0085` só adiciona
  `notification_type = appointment_confirmation_response`.
- **Status separado** de `calendar_events.status`: a resposta do cliente **nunca** altera o status
  do evento nem libera o horário (o profissional decide).
- **Token**: `randomBytes(32)` base64url (43 chars); só o **sha256** é guardado, **na mesma linha**
  do evento (uma tabela de tokens exigiria escrita via `DRIZZLE_ADMIN` com FK dentro da
  transação por request — travaria). Consequência: **um token válido por evento**; criar,
  reagendar (`starts_at` mudou), trocar o e-mail e o **lembrete de 24h** rotacionam o token e o link
  anterior passa a dar 404 ("substituído por um e-mail mais recente"). Validade = `starts_at`.
- **Ciclo** (`planConfirmationChange`): `start_cycle | clear | keep`. Só começa com `startsAt > now`
  e e-mail presente, tipo `appointment`, evento não cancelado, flag ligada. Com flag desligada,
  reagendar/trocar e-mail **limpa** o ciclo.
- **Envio best-effort, pós-COMMIT**: o use-case chama `scheduleConfirmation(eventId, token)` →
  `registerPostCommit`; o hook relê a linha por hash (conexão admin; confirma commit + ciclo vigente
  e traz `orgName`) e só então envia; `confirmation_sent_at` só se o `MailService` retornar `true`.
  Nunca enviar e-mail nem engolir erro de banco dentro da transação do request (um erro engolido
  deixa a transação abortada e o COMMIT vira ROLLBACK silencioso).
- **Lembrete 24h (cron `customer-confirmation-reminders`)**: `DRIZZLE_ADMIN`, lote de 200,
  `claimCustomerReminder` atômico e **preso ao ciclo lido** (`confirmation_requested_at` do
  snapshot + janela + `requested_at <= starts_at - 24h`), `storeReminderToken` é compare-and-swap
  (`customer_reminder_sent_at = claimedAt`, `scheduled`). Envio falho → libera o claim; falha no
  store após o e-mail sair → não libera (evita duplicar) e loga `error`. Marcador próprio
  (`customer_reminder_sent_at`), independente do `reminder_sent_at` (lembrete in-app ao profissional).
- **Superfície pública** `public/appointment-confirmations/:token` (GET + POST `respond`),
  kill-switch `APPOINTMENT_CONFIRMATION_ENABLED` (**default off**; off ⇒ 404 e nenhum ciclo/cron),
  `@Throttle` por rota (GET 30/min, POST 10/10min), payload mínimo
  `{orgName, startsAt, endsAt, allDay, confirmationStatus, state}`; erros 404/410/409.
  `DRIZZLE_ADMIN` escopado por hash/id e só nas colunas de confirmação (ADR-0021).
- **Privacidade**: o funcionário não vê `customer_email`/estado de confirmação de evento
  `shared` de outro membro (`withoutCustomerEmail`); logs só com `recipientDomain()`.

## Consequências / pendências

- **LGPD**: `customer_email` e o ciclo sobrevivem à exclusão do cliente (`customer_id` é
  `ON DELETE SET NULL`). Registrar no backlog Tier 2 de retenção (ADR-0018) a limpeza dessas colunas.
- O token em claro vai no path e pode aparecer em log/telemetria de 4xx/5xx (mesmo padrão da
  anamnese). Follow-up: redigir segmentos de token em `/public/*` no `all-exceptions.filter.ts`.
- `down` da `0086` apaga e-mails/status; em produção prefira desligar a flag. `down` da `0085` é no-op.
- O migrator aplica **todas** as pendentes numa transação: nenhuma migration do mesmo lote pode usar o
  valor novo de enum.
- Ligar a flag em produção é **ação manual** (e o texto do `event-form` só promete envio "quando a
  confirmação por e-mail estiver ativa"). A flag não é exposta ao frontend.
