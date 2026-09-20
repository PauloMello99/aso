# ADR-0028 — Campanhas: trava de allowlist fora de produção, webhook de bounce e relatório de entrega

**Status:** Aceito
**Data:** 2026-09-19

## Contexto

Bloco 4 do backlog da reunião de **2026-09-15**. Pré-requisito de ativar `CAMPAIGNS_ENABLED` em
ambiente de teste sem risco de e-mail chegar a cliente real, e fechar a dívida da ADR-0025
(*"`bounced` não é escrito"*): o dono precisa saber quem não recebeu para cobrar atualização de
cadastro.

## Decisões

### 1. Sinal de ambiente: `APP_ENVIRONMENT`, seguro por padrão

Staging e produção são Railway Environments separados (ADR-0011) e **nenhum sinal em código**
distinguia os dois (`NODE_ENV=staging` não é usado). Nova env var `APP_ENVIRONMENT`.
Regra: `enforcing = APP_ENVIRONMENT !== "production"` — o estado perigoso (enviar a qualquer
destinatário) exige a string literal `production`; ausente, vazia ou inválida cai no estado seguro
(allowlist ativa). Cobre local/dev automaticamente. Alternativa descartada: inferir staging pela
presença de `EMAIL_ALLOWLIST` (esquecer de configurar em staging faria staging agir como produção).

**Pré-requisito de deploy:** `APP_ENVIRONMENT=production` precisa estar setada em produção **antes**
do primeiro deploy deste bloco — com a var ausente, todo e-mail (reset de senha, convite) para de
sair (fail-safe por design). O `EmailAllowlistService` loga uma vez no boot o modo resolvido e o
tamanho da lista (nunca os endereços) — é a verificação pós-deploy.

### 2. Allowlist: allowlist vazia bloqueia tudo; gate em duas camadas

`EMAIL_ALLOWLIST` (vírgula/ponto-e-vírgula/espaço, igualdade exata case-insensitive). Lista vazia
com enforcing ⇒ bloqueia **todo** envio. A trava vale para **todo e-mail do app**
(`ResendEmailSender` retorna `false`, nunca lança), mas o gate que importa está no
`RunCampaignTriggersUseCase`, **antes** de `prefRepo.ensureForCustomer` e do envio: como o sender
devolve `false` sem exceção, só bloquear lá faria o use-case gravar `sent` e queimar o `dedupe_key`.
Alvo bloqueado **não deixa nenhuma linha** em `campaign_sends` (gravar `failed` consumiria as 3
tentativas de retry); custo aceito: em staging o alvo é re-selecionado e re-logado a cada run.

Efeito conhecido, herdado do contrato de "não enviado": `InviteMemberUseCase`/`ForgotPasswordUseCase`
só reagem a exceção, então em staging um convite/reset bloqueado pela allowlist reporta sucesso sem
enviar.

### 3. Correlação envio↔bounce por tag, sem coluna nova

O SDK Resend ecoa `tags` em todo evento `email.*`. O use-case gera `randomUUID()` antes do envio e o
usa **como tag `campaign_send_id` e como `id` da linha `sent`** (4 pontos: sent/failed ×
retry/principal). Sem migration de `provider_message_id`. Charset de tag `[a-zA-Z0-9_-]` — UUID é
compatível (o `dedupe_key`, com `:`, não seria).

### 4. Webhook de bounce: endpoint e segredo próprios, semântica invertida em relação ao suporte

`POST /webhooks/campaign-delivery`, segredo `RESEND_DELIVERY_WEBHOOK_SECRET` (cada endpoint do
Resend tem o seu; reusar o do suporte daria 401 em todo bounce). Assinatura verificada por
`webhooks.verify` do SDK, fail-closed sem bypass em nenhum ambiente. Controller filtra
positivamente `email.bounced` (o use-case não filtra tipo). **Inversão deliberada** vs. o webhook do
suporte: `handled:false` (sem tag / linha não encontrada) responde **200**, nunca 5xx — o endpoint
recebe todo e-mail da conta (convite, reset, SLA…) e 5xx geraria loop de reentrega até o Resend
desabilitá-lo; exceção real de infraestrutura continua propagando. Bounce = **INSERT de linha nova**
`status='bounced'` (append-only); idempotência vem da UNIQUE `(dedupe_key, attempt, status)`
(`ON CONFLICT DO NOTHING`). `reason` passa por `redactEmail`; audit
`campaign_email_bounced` (migration 0076, `ALTER TYPE … ADD VALUE`, down no-op irreversível como as
4 anteriores) sem PII. Bounce chegando antes do COMMIT da linha `sent`, ou de envio cujo INSERT
falhou, é perdido com WARN (reconciliação manual) — nunca forçado por 5xx.
Client de verificação duplicado do de inbound do suporte de propósito (módulos independentes,
contratos de retorno divergem); no ramo `email.bounced` usa narrowing real da union, sem cast.

### 5. Relatório: policy de SELECT owner-only + filtro explícito de org

Migration 0077: `campaign_sends_select` = `is_super_admin() OR is_org_owner(org_id)`, **supersede a
decisão (f) da 0063** ("sem policy, log administrativo"); escrita continua sem policy (só
`DRIZZLE_ADMIN`). `is_org_owner` é avaliado **por linha**: dono de 2+ orgs veria todas —
o repositório de leitura (`DRIZZLE`, separado do repositório admin do cron) **filtra `WHERE org_id`
explicitamente**; a RLS é defesa em profundidade, não escopo. `GET /orgs/:orgId/campaigns/deliveries`
owner-only, últimos 200, `{summary, items}`, LEFT JOIN em customers (cliente removido por LGPD →
"Cliente removido"). UI: seção dentro de `campaigns-list-page.tsx` (sem tela nova), cards <1280px e
tabela ≥1280px.

## Gotchas
- O migrator (drizzle 0.45) aplica **todas as migrations pendentes numa única transação**: uma
  migration posterior no mesmo lote não pode *usar* um valor de enum recém-adicionado por `ADD VALUE`
  (0077 não usa o literal, por isso é segura).
- Rollback da 0077 depois do endpoint no ar faz o relatório devolver 0 linhas **em silêncio** (RLS sem
  policy nega sem erro) — coordenar com o rollback do código.
- `pnpm db:gen-types` é comando de raiz (não `--filter backend`).
- Validar RLS exige `SET LOCAL ROLE app_user` (PG17 separa `set_option`; usar
  `GRANT app_user TO postgres WITH SET TRUE` dentro da transação de teste, revertida no ROLLBACK).

## Fora de escopo / backlog
- `email.complained` (spam) e `email.delivered`: ignorados (200); reclamação exigiria valor novo de
  `campaign_send_status` ou escrita em `customer_email_preferences` (argumento de LGPD).
- Sincronizar `admin/lib/audit-labels.ts` (frontend, 18 valores) com o valor novo.
- `packages/types/src/database.types.ts` morto e defasado (nenhum app o importa).
- Unificar os dois clients de verificação de webhook em `mail`, se um dia divergirem.
- Pendente de infra (ação do usuário): criar o endpoint `/webhooks/campaign-delivery` no painel do
  Resend, preencher `RESEND_DELIVERY_WEBHOOK_SECRET`, `APP_ENVIRONMENT` e `EMAIL_ALLOWLIST`; validar
  em staging com um bounce real (`bounced@resend.dev`) que os headers `svix-*` batem e que a tag
  volta no evento antes de considerar o 4.2 fechado ponta a ponta.
