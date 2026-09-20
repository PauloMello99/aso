# ADR-0033 — Aviso de novidades por e-mail aos donos, guiado por SemVer (Bloco 5.2, fatia C)

**Status:** Aceito
**Data:** 2026-09-19

## Contexto

Direção do produto (reunião 2026-09-15 + decisão de 2026-09-19): ao publicar um item no changelog versionado
(ADR-0030), avisar os **donos** por e-mail **se relevante**. Critério de relevância definido pelo usuário: **SemVer do
produto** — só releases MAJOR e MINOR valem item de changelog e, por isso, notificação; PATCH não notifica.
A versão de produto é única para o monorepo (ADR-0031, base 1.0.0).

## Decisões

1. **Relevância derivada, não declarada.** `ChangelogEntry` ganhou `semver` (versão de PRODUTO do release) e perdeu
   `notifyOwners`. `shouldNotifyOwners(semver, previousSemver)` = bump MAJOR ou MINOR entre releases consecutivos
   (patch/igual/regressão/inválido/sem anterior ⇒ false). `getNotifiableEntries()` = itens com ordinal
   `version > NOTIFY_FROM_VERSION` (4 — o catálogo baseline, pré-existente ao versionamento) E que passam em
   `shouldNotifyOwners` contra o item imediatamente anterior por ordinal. O seed atual tem 0 itens notificáveis (nenhum
   e-mail retroativo). O ordinal inteiro `version` continua sendo o high-water mark do banner (não é derivado do semver).
2. **Log append-only `changelog_notifications`** (migration 0083): `UNIQUE (user_id, entry_id)`, status `sent|failed`,
   CHECK (`sent` ⇒ `sent_at` e sem `error`; `failed` ⇒ sem `sent_at`), sem FK para `users` (log histórico de comunicação;
   LGPD por pseudonimização), RLS sem policy + REVOKE anon/authenticated (só `DRIZZLE_ADMIN`). **Falha é terminal**
   (sem retry por tentativa; aceitar a perda, sem DELETE manual). A coluna `error` guarda só **classe/código redigido**
   (`classifyDeliveryError`/`redactDeliveryError`: `send_returned_false` | `network_error` | `provider_http_<status>` |
   `provider_error` | `unknown_error`) — `error` guarda só a classe, nunca texto livre nem payload do provedor.
3. **Opt-out do usuário** (migration 0082, ANTES do log para que reverter o log preserve o consentimento):
   `users.product_updates_opted_out_at`; `PATCH /auth/me { productUpdatesOptedOut: boolean }` (o servidor deriva a data;
   não regrava se já optado); `/auth/me` expõe só o booleano (`toMeResponse`), nunca o timestamp. Switch em Minha Conta.
4. **Alvos** (`findOwnersToNotify`, `DRIZZLE_ADMIN`, SQL cru): donos REAIS (`org_memberships.role='owner'` E
   `enabled = true`) de org não suspensa, e-mail não vazio, sem opt-out, `users.created_at <= publishedAt`, ainda não
   notificados do item; `DISTINCT ON (u.id)` (dono de N orgs = 1 e-mail). `super_admin` NÃO é sintetizado como owner
   (ADR-0013 não vale para alvo de e-mail). Sem harness de banco no backend: a **sonda SQL** de
   `docs/changelog-announcements-local-testing.md` é a verificação do predicado.
5. **Use-case `SendChangelogAnnouncementsUseCase`** no tick do internal-cron: gates (A) kill-switch
   `CHANGELOG_ANNOUNCEMENTS_ENABLED` (default OFF), (B) canal (`NOTIFICATIONS_EMAIL_ENABLED` + `RESEND_API_KEY`),
   (C) `claimRun` de 10 min (serializa ticks sobrepostos: o UNIQUE dá idempotência de LINHA, não de e-mail).
   Por alvo: allowlist (ADR-0028) ANTES de enviar e ANTES de gravar qualquer linha (bloqueado ⇒ zero linha, senão o
   dedupe é queimado e o dono real nunca receberia em produção); envio em try/catch (o sender pode lançar);
   `recordSent`/`recordFailed`. Teto de 50 envios por tick; varredura de até 500 candidatos (alvos bloqueados em
   staging não consomem o teto nem escondem um dono permitido).
6. **Janela de recência de 30 dias** (`ANNOUNCEMENT_RECENCY_DAYS`, aplicada no use-case sobre `publishedAt`): quem passa
   a ser elegível DEPOIS (funcionário promovido a dono, opt-out revertido, org que sai de suspensão) receberia o
   histórico inteiro de releases (o anti-join é por `(user_id, entry_id)` e `getNotifiableEntries()` devolve todos os
   itens notificáveis para sempre). Com a janela, recebe no máximo os releases dos últimos 30 dias; itens mais antigos
   são ignorados sem gravar linha. Política definida pelo assistente na revisão (2026-09-19); ajustar a constante se o
   produto preferir outra (ex.: só o último release).
7. **Elegibilidade por dia (UTC):** `u.created_at < ((publishedAt::date + 1)::timestamp AT TIME ZONE 'UTC')` — quem se
   cadastrou até o fim do dia da publicação é elegível; independe do TimeZone da sessão (verificada em UTC,
   America/Sao_Paulo e Pacific/Auckland).
8. **Operação:** desligar em produção = kill-switch, **NÃO** rollback das migrations 0082/0083 (o rollback do log
   reenviaria tudo; o do opt-out apagaria o consentimento).

## Consequências / dívidas

- Publicar um item de changelog minor/major é o que dispara o e-mail no próximo tick (com a flag ligada): exige item
  acima do corte + bump de versão (guard de spec, ADR-0031) — o processo é a skill `product-versioning`.
- O predicado de alvos e o repositório do log não têm teste de integração automatizado (só a sonda + e2e manual).
- `resend-email-sender.ts` passou a logar só o DOMÍNIO do destinatário (falha, sucesso, desabilitado). O `error.message`
  vindo do Resend ainda vai para o log de erro e pode ecoar o endereço — dívida (passar por `redactDeliveryError`).
- `users_select_same_org` expõe `product_updates_opted_out_at` a pares de org no banco (só timestamp de preferência;
  as queries de membros projetam colunas explícitas).
- Pré-requisito de deploy: migrations 0069-0083 ANTES do backend; variáveis novas: `CHANGELOG_ANNOUNCEMENTS_ENABLED`.
