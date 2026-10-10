# ADR-0039 — Respostas "Agendou" / "Não agendou" dos orçamentos (Bloco C, fatia C3b)

**Status:** Aceito (C3b). Implementa as recomendações vinculantes do ADR-0038.
**Data:** 2026-10-09

## Contexto

O profissional atende o cliente por `wa.me` e então responde o pedido na caixa de entrada (ADR-0037):
**Agendou** (cria o evento e o pedido some por completo) ou **Não agendou** (apaga as imagens; contato retido só com
consentimento). O encerramento apaga dados pessoais e arquivos (irreversível), por isso a ordem e a atomicidade importam.

## Decisão

- **Encerrar é escrita privilegiada escopada** (`DrizzleQuoteRequestPurgeRepository.closeAndClaim`, `DRIZZLE_ADMIN`,
  exceção do ADR-0021): **um UPDATE** grava `status`, `closed_at`, `expires_at`, `purge_requested_at`, `purge_scope`,
  `purge_attempts+1` e o lease (`purge_last_attempt_at`) — os CHECKs da 0091 exigem as colunas juntas, e o lease
  impede o cron de reivindicar em paralelo (`SKIP LOCKED`). Filtro: `org_id + id + target_user_id` (vindo do detalhe
  autorizado pela sessão, **nunca do body**) `+ status='new' + purge_requested_at IS NULL + expires_at > now`.
  `status/closed_at/purge_*` **nunca** entram no GRANT de coluna da sessão.
- **Agendou**: `CreateCalendarEventUseCase` (Bloco B) cria o evento **pela sessão** (`appointment`, `assignedTo` =
  profissional destino, `customerEmail` = e-mail do pedido se utilizável, `private`, sem telefone/ideia, título
  `Orçamento: <nome>`); o encerramento roda num **hook pós-commit aguardado** (`closeAfterCommit`) com **prova de
  commit**: o UPDATE exige `EXISTS` do evento (`id` + `source_quote_request_id`) lido pelo admin. Conflito de horário
  (409 do Bloco B) mantém o pedido intacto. Ciclo de confirmação do Bloco B só com `APPOINTMENT_CONFIRMATION_ENABLED` e
  `startsAt > now`; e-mail inutilizável ⇒ evento sem confirmação, sem erro.
- **Idempotência/dedup**: `calendar_events.source_quote_request_id` (uuid **sem FK**, referência opaca que sobrevive à
  purga) + índice único parcial `(org_id, source_quote_request_id)`; retry/duplo clique: evento existente é reutilizado
  (`alreadyScheduled`), corrida real gera 23505 → `CALENDAR_EVENT_SOURCE_CONFLICT` (409) **relançado, nunca engolido
  na transação de sessão**.
- **Não agendou**: `purge_scope='images'` quando há consentimento de retenção (contato retido até `closed_at + 720 h`),
  senão `'all'`; purga imediata via `QuoteRequestPurger`, com a fila (ADR-0038) como fallback.
- **Autorização**: funcionário só responde pedido próprio, owner em nome do profissional; "Agendou" exige o módulo
  `schedule` (`QUOTE_SCHEDULE_FORBIDDEN` 403) e `ActiveSubscriptionGuard` (paridade com `POST /calendar`); **recusar
  não exige assinatura ativa** (só reduz dados pessoais). Flag `PUBLIC_QUOTE_FORM_ENABLED` primeiro guard.
- **Hardening (0092)**: policies de `quote_requests` recriadas com `AND status='new' AND purge_requested_at IS NULL`;
  `REVOKE INSERT, DELETE` (e `UPDATE` nas imagens) de `app_user` — a cascata de FK roda como dono e continua válida
  (verificado: exclusão de org com pedidos).
- **Auditoria**: `audit_action = 'quote_request_closed'` (0093, migration separada) gravada **só quando o
  encerramento ocorreu**, metadata sem PII `{outcome, imageCount, contactRetained[, eventId]}`. No `scheduled` a
  gravação ocorre no hook (fire-and-forget; `actingAsSuperAdmin` capturado de forma síncrona antes).
- **Contato retido sem leitor (decisão do usuário, aceita)**: "Não agendou" com consentimento mantém o contato 720 h,
  mas nenhum caminho de leitura o enxerga (`visibleTo` e policies exigem `status='new'`). O ADR-0038 (rec. 4) previa
  "criar o leitor ou não estender"; o usuário **optou explicitamente por estender** em 2026-10-09. **Dívida LGPD/jurídica
  registrada**: o texto do consentimento precisa cobrir a retenção sem uso imediato; se o jurídico preferir, trocar o
  `CASE` do `expires_at` em `closeAndClaim` (1 linha) para não estender até existir um leitor.

## Consequências / pendências

- O `down` da 0092 perde a rastreabilidade pedido→evento e devolve INSERT/DELETE ao `app_user`: reverter o código antes.
- `super_admin` não-membro **não consegue "Agendou"** (o Bloco B não sintetiza super_admin no `getMembership`; igual ao
  `POST /calendar`); consegue "Não agendou" (sintetizado como owner).
- Lote de migrations 0085–0093 em produção inclui `ADD COLUMN`/índice em `calendar_events`: aplicar em janela de baixo
  tráfego com `lock_timeout` (PGOPTIONS) e conferir o tamanho da tabela antes.
- `calendar_events` não tem `REVOKE ALL FROM anon, authenticated` (pré-existente): fora do escopo.
- `db:status` local mostra "file changed since applied" por `core.autocrlf` (sugestão: `*.sql text eol=lf` em
  `.gitattributes`, mudança separada).

## Checklist de go-live (flag `PUBLIC_QUOTE_FORM_ENABLED`)

1. Aplicar as migrations 0085–0093 **antes** do backend (janela de baixo tráfego, `lock_timeout`).
2. Aprovação jurídica do texto de consentimento (`quote-v1-minuta-2026-10`), incluindo a retenção do contato sem uso
   imediato e o que é retido (nome, telefone, e-mail e descrição do pedido).
3. Teste manual no navegador interno do Instagram (iOS/Android): Turnstile, seletor de arquivo/HEIC; chaves de
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` configuradas (Turnstile fail-closed).
4. Decidir `APPOINTMENT_CONFIRMATION_ENABLED` (confirmação por e-mail do cliente ao agendar).
5. Release: `pnpm version:bump minor` (1.3.0) + item de changelog (`module: 'quotes'`) + **atualizar
   `ONBOARDING_MODULE_META.quotes.introducedAt` para o instante do go-live** (ADR-0037).
6. Conferir que os jobs `quote-request-purge` e `quote-orphan-sweep` rodam no tick (ADR-0038) e o storage está sem
   resíduo após a expiração (verificar o bucket, não só o banco).
7. Ligar `PUBLIC_QUOTE_FORM_ENABLED=true` (ação manual).
