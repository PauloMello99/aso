# ADR-0038 — Ciclo de vida e purga de orçamentos (Bloco C, fatia C3a)

**Status:** Aceito (C3a). A C3b (Agendou / Não agendou) usa este desenho sem nova migration de estado.
**Data:** 2026-10-09

## Contexto

O consentimento do formulário (ADR-0036) promete que o pedido "não tratado" é descartado em até 30 dias e
que as imagens são apagadas quando o pedido é encerrado. Até a C2 nada apagava dados nem arquivos
(`SupabaseStorageProvider.removeFile` ignora o `{error}`; pendência do ADR-0018 Tier 2).

## Decisão

- **Estados** (`0091`): `status` ∈ `new | scheduled | not_scheduled` (text + CHECK); `closed_at` NULL sse `new`;
  `expires_at` = **prazo final da linha** (imutável para `new` = criação + 30 dias; visualizar não estende),
  limitado por CHECK a `COALESCE(closed_at, created_at) + interval '720 hours'` (horas, não dias: independe de
  TimeZone/DST). Fila de purga (**só `DRIZZLE_ADMIN` escreve**): `purge_requested_at`, `purge_scope`
  (`all`|`images`), `purge_attempts` (incrementa no claim), `purge_last_attempt_at` (lease de 10 min e chave de
  CAS), `purge_last_error` (só código, regex no CHECK: sem texto livre/PII). Invariantes por CHECK: `scheduled` ⇒
  `purge_scope='all'`; `images` só em `not_scheduled`; `not_scheduled` sem consentimento ⇒ `all`. **Gotcha:** CHECK
  com NULL passa; usar `IS [NOT] DISTINCT FROM` (bug corrigido na própria 0091).
- **Remoção verificada no Storage**: `IStorageProvider.removeFiles` (lote, verifica erro) e `listObjects`
  (um nível, paginado) lançam `StorageOperationFailedException` (`STORAGE_OPERATION_FAILED` → 502, mensagem
  fixa). `removeFile` legado **inalterado** (customer-attachments e service-media seguem com o débito do ADR-0018).
- **Purga de um pedido** (`QuoteRequestPurger`): arquivos → **re-listagem** (resíduo = falha) → linha. Guarda de
  prefixo `{org}/{id}/`. Falha ⇒ linha pendente, `purge_attempts++`, `purge_last_error`=código, novo claim após o
  lease (próximo tick de 15 min). Sem dead-letter (obrigação LGPD); log `error` a partir de 8 tentativas.
- **Claim**: um statement (CTE + `FOR UPDATE SKIP LOCKED` + UPDATE…RETURNING), ordem anti-starvation
  (`purge_attempts ASC`), `now` da aplicação (ms) como chave de CAS (`completeImagePurge`).
- **Sweep de órfãos** (`SweepOrphanQuoteObjectsUseCase`, throttle `claimRun` 6 h): pastas UUID estritas
  (minúsculas) `{org}/{request}`; órfão = par `(org, request)` sem linha (cobre orgs removidas, cujas linhas saem por
  CASCADE e os objetos ficam); só remove objetos com **≥ 24 h** pelo `created_at` do objeto (o upload ocorre antes do
  INSERT); `createdAt` nulo nunca remove; **erro na consulta de existência aborta a org** (nunca vira "nenhum
  existe"); lista o nível inteiro antes de remover; tetos de 1000 remoções/5000 pastas.
- **Jobs sem kill-switch**: `quote-request-purge` e `quote-orphan-sweep` rodam sempre, independentes de
  `PUBLIC_QUOTE_FORM_ENABLED` (dados coletados com a flag ligada precisam ser purgados mesmo se ela for desligada).
- **Auditoria**: a purga automática não grava `audit_logs` (sem ator humano; só log estruturado sem PII). A C3b
  adiciona um valor próprio de `audit_action` (migration separada) para a ação do usuário.
- **Leitura**: `visibleTo` agora exige `status='new'` e `purge_requested_at IS NULL`; a policy RLS da 0089 não
  filtra isso (defesa em profundidade pendente: ver C3b).

## Recomendações vinculantes para a C3b

1. **Encerrar é escrita privilegiada via `DRIZZLE_ADMIN` escopado** (exceção do ADR-0021, duas classes de ator:
   sessão e cron): autorizar o ator pela sessão (`findDetailForViewer` sob RLS) e então gravar `status`,
   `closed_at`, `expires_at` e `purge_*` **numa única UPDATE** (os CHECKs exigem as colunas juntas). **Nunca** incluir
   `status`/`closed_at`/`purge_*` no GRANT de coluna da sessão (o tenant controlaria a fila). Isto **corrige** a
   nota do ADR-0037.
2. "Não agendou" **com** consentimento: enfileirar `purge_scope='images'` **no mesmo UPDATE** (o banco não distingue
   "imagens já purgadas" de "nunca enfileiradas"; a promessa do consentimento depende do código) e cobrir com teste.
3. Reutilizar `QuoteRequestPurger` para a purga imediata; se falhar, o pedido já está na fila.
4. Contato retido (`not_scheduled` com consentimento) hoje não tem leitor (`visibleTo` só mostra `new`): ou criar o
   leitor (com ramo de policy próprio) ou não estender `expires_at` até que exista (minimização LGPD).
5. Recriar `quote_requests_select/update` (0089) com `AND status='new' AND purge_requested_at IS NULL` (imagens
   herdam por EXISTS) e considerar `REVOKE INSERT, DELETE ... FROM app_user` nas duas tabelas (hardening).
6. Novo valor de `audit_action` em migration separada (precedentes 0065/0076), sem PII no metadata.

## Consequências / pendências

- O `down` da 0091 falha de propósito se houver linha com `status <> 'new'` e descarta a fila: drenar (tick) antes.
- Notificações `quote_request_received` antigas podem apontar para pedido purgado (404 uniforme).
- Índice parcial `quote_requests_purge_pending_idx` serve só à pertinência do ramo pendente (o claim sempre ordena);
  o ramo `expires_at <= now` usa o índice de `expires_at`.
- `removed` do sweep = caminhos solicitados (não confirmados); sweep em orgs muito grandes pode sofrer starvation
  por offset (fail-safe: nunca remove errado).
- Go-live da flag: C3a (purga/sweep) está pronta; falta a C3b (fluxo Agendou/Não agendou) e as pendências do
  ADR-0036 (texto jurídico, teste no navegador do Instagram) + release (ADR-0037).
