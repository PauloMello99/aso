# Campanhas de e-mail por gatilho — teste local

Guia operacional pra testar o módulo `modules/campaigns` (T6 — gatilhos
pós-atendimento / aniversário / inatividade, opt-out por cliente (LGPD), **CRUD de
campanhas** por org com corpo rich-text, upload de imagem, endpoint público de
descadastro) contra o Postgres local do Supabase, sem depender de e-mail real. Racional
das decisões em
[`.memory/adr/0025-campanhas-email-por-gatilho.md`](../.memory/adr/0025-campanhas-email-por-gatilho.md)
— o **corpo original** do ADR + o **Addendum 2026-09 (rework T6)**, que é o que este guia
reflete.

> **Por que este guia existe:** os predicados de seleção e de opt-out das campanhas
> vivem em **SQL cru** dentro de `drizzle-campaign-target.repository.ts` e
> `drizzle-campaign-send.repository.ts` (`findRetriable`). O backend **não tem harness
> de integração de banco**, então esses predicados **não têm cobertura automatizada**.
> Esta bateria manual **é** a verificação. Se qualquer predicado mudar, re-rode-a.

## O que mudou no rework T6 (relevante para este guia)

- `org_campaign_settings` (migration `0062`, 1 linha/org) foi **dropada** pela migration
  `0067` e substituída pela tabela **`campaigns`** (migration `0066`): **N linhas por
  org, UMA por gatilho** (`UNIQUE (org_id, trigger)`). As queries de gatilho fazem
  `INNER JOIN campaigns cp ON ... AND cp.trigger = '<gatilho>' AND cp.enabled = true`.
- O **corpo** do e-mail deixou de ser texto puro e passou a **Tiptap-JSON** (`campaigns.body`,
  `jsonb`), validado por um walker de **allowlist fechada** (`validateCampaignBody`) antes
  de gravar. O **assunto** continua texto puro.
- **Copy custom** agora é o próprio CRUD (`POST`/`PATCH /orgs/:orgId/campaigns`), não mais
  um `PUT` de settings.
- Novo bucket público **`campaign-images`** (migration `0068`) + `POST /orgs/:orgId/campaigns/images`.

## O que dá para exercitar sem uma chave real do Resend

`ICampaignMailer.sendCampaign` delega ao `MailService` central; sem `RESEND_API_KEY` o
sender é no-op e devolve `false` (engolido pelo `dispatch`). Mas o
`RunCampaignTriggersUseCase` **checa o canal de e-mail no Gate B e pula o job inteiro
antes de reivindicar o tick** — logo, sem chave **nenhuma linha `campaign_sends` é
gravada** e os 3 gatilhos não rodam de ponta a ponta.

| Precisa de chave Resend (teste) | Só flag / log / HTTP / SQL |
|---|---|
| 4 (envio real do gatilho), 8 (dedupe — ou seed manual de uma linha `sent`), parte "assunto/corpo interpolado" do 12 | 1, 2, 13 (flag + log) · 3, 5, 6, 7, 9, 10 (sondas SQL dos predicados) · 11, 14, 15 e parte "auditoria" do 12 (HTTP + DB, nenhum envia e-mail) |

Sem chave, os predicados de seleção/opt-out se verificam rodando as **sondas SQL**
(seção 5) diretamente — elas espelham linha a linha o SQL dos repositórios.

## Pré-requisitos

- Stack local do Supabase no ar: `pnpm db:start` (`npx supabase start`).
- Migrations aplicadas: `pnpm --filter backend db:migrate` (precisa das `0061`, `0063`,
  `0065`, e as do rework `0066` / `0067` / `0068`). As migrations `0066`+ são **escritas
  à mão** (`.sql` + `.down.sql` + entrada manual em `meta/_journal.json`) — não use
  `db:generate`.
- Backend rodando: `pnpm --filter backend dev` (porta `3001`; dentro do Claude Code o
  processo `backend` de `.claude/launch.json`).
- `apps/backend/.env` com pelo menos `CRON_SECRET` preenchida. Para os cenários de
  imagem (15), `SUPABASE_URL` precisa estar preenchida (aponta para a API do Supabase
  local) — o walker usa esse valor como prefixo obrigatório de `image.src`. Sem ela, o
  walker aceita qualquer `image.src` http(s) (a âncora de bucket é desligada).
- Acesso SQL ao banco local (`psql` no container `supabase_db_aso`, ou o SQL editor do
  Supabase Studio local). Todos os `<...>` nos exemplos são placeholders de UUID.
- **Opcional** (só p/ cenários de envio real): `RESEND_API_KEY` de uma conta Resend em
  modo teste.

## 1. Configurar ambiente

Gates do `RunCampaignTriggersUseCase.execute()`, **nesta ordem** — o primeiro que falha
faz o job virar no-op:

| Ordem | Gate | Var(s) | `reason` do skip |
|---|---|---|---|
| A | Kill-switch global | `CAMPAIGNS_ENABLED` (`=== "true"`) | `flag_disabled` |
| B | Canal de e-mail (espelha o `ResendEmailSender`) | `NOTIFICATIONS_EMAIL_ENABLED === "true"` **e** `RESEND_API_KEY` não-vazia | `email_channel_disabled` |
| C | Self-throttle (claim atômico, janela 20h) | linha em `cron_job_state` (`job_name = 'campaign-triggers'`) | `throttled` |

Gates A e B rodam **antes** do claim de propósito: um lote com o canal desligado
gravaria a linha `sent` e queimaria o `dedupe_key` sem entregar nada, e reivindicar o
tick consumiria a janela de 20h à toa.

| Var | Valor p/ testar | Observação |
|---|---|---|
| `CAMPAIGNS_ENABLED` | `true` | Ausente ou `!= "true"` → Gate A |
| `NOTIFICATIONS_EMAIL_ENABLED` | `true` | Metade do Gate B |
| `RESEND_API_KEY` | chave de teste (ou deixe vazia) | Vazia → Gate B (`email_channel_disabled`), **não reivindica** o tick |
| `FRONTEND_URL` | `http://localhost:3000` | Base do link de descadastro: `${FRONTEND_URL}/preferencias-email/<token>` |
| `CRON_SECRET` | qualquer string | Header `x-cron-secret` do tick |

Reinicie o backend após mexer no `.env`.

## 2. Disparar o job manualmente

O job `campaign-triggers` não tem `@Cron` próprio — roda em todo tick, como os demais:

```powershell
curl -X POST http://localhost:3001/internal/cron/tick -H "x-cron-secret: <CRON_SECRET>"
```

- A resposta HTTP traz `{ ok: true, jobs: [...] }`; procure
  `{ "name": "campaign-triggers", "status": "ok", ... }`. Um skip **não** é `error` —
  aparece como `status: ok`.
- O `reason` do skip e os contadores (`sent`/`failed`/`retried`) **não** vão na
  resposta HTTP — só no **log do backend**:
  - `flag_disabled` → `Campanhas desabilitadas (CAMPAIGNS_ENABLED) — no-op.`
  - `email_channel_disabled` → `Canal de e-mail desligado — no-op (não reivindica o tick).`
  - `throttled` → **sem log** (retorna em silêncio).
  - run efetivo → `Campanhas (retry antes do loop): retried=<n> sent=<n> failed=<n>`.
- **Depois de um run efetivo (Gate C reivindicado), o próximo tick nas 20h seguintes
  volta `throttled` sem log.** Para re-rodar na mesma sessão de teste:
  `DELETE FROM cron_job_state WHERE job_name = 'campaign-triggers';`

## 3. Seeds base

Use uma org + cliente reais já criados pelo onboarding no preview e pegue os UUIDs:

```sql
SELECT id, name, slug, suspended_at FROM organizations ORDER BY created_at DESC;
SELECT id, name, email, enabled, birth_date FROM customers WHERE org_id = '<org_id>';
SELECT id, customer_id, performed_at, canceled_at FROM services WHERE org_id = '<org_id>';
```

Criar UMA campanha por gatilho para a org, habilitada (sem a linha, `INNER JOIN campaigns`
→ o gatilho nunca dispara). `name` é `NOT NULL` (CHECK `btrim` 1–80); `enabled` tem
default `false` → precisa `true`; `inactivity_months` é **`NULL` para
`post_service`/`birthday`** e **1–36 para `inactivity`** (CHECK
`campaigns_inactivity_months_check`, bidirecional):

```sql
INSERT INTO campaigns (org_id, trigger, name, enabled, inactivity_months)
VALUES
  ('<org_id>', 'post_service', 'Pós-atendimento', true, NULL),
  ('<org_id>', 'birthday',     'Aniversário',     true, NULL),
  ('<org_id>', 'inactivity',   'Inatividade',     true, 6)
ON CONFLICT (org_id, trigger) DO UPDATE SET
  enabled           = EXCLUDED.enabled,
  inactivity_months = EXCLUDED.inactivity_months;
```

`subject` e `body` ficam `NULL` = usa a copy default autoral do produto
(`CAMPAIGN_DEFAULT_COPY`, fallback **por campo**). Para copy custom, ver cenário 12.

Tornar um cliente elegível por gatilho (edita dados de produto — aceitável no banco
local de teste):

```sql
-- Aniversário HOJE (dia-calendário America/Sao_Paulo), mantendo mês/dia:
UPDATE customers
SET birth_date = ((now() AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '30 years')::date
WHERE id = '<customer_id>';

-- Pós-atendimento: 1 serviço não-cancelado na janela [now-48h, now-24h):
UPDATE services SET performed_at = now() - INTERVAL '36 hours', canceled_at = NULL
WHERE id = '<service_id>';

-- Inatividade: TODO serviço não-cancelado do cliente > inactivity_months atrás
-- (INNER JOIN em services → cliente sem serviço nunca entra):
UPDATE services SET performed_at = now() - INTERVAL '10 months', canceled_at = NULL
WHERE customer_id = '<customer_id>' AND org_id = '<org_id>';
```

Criar a linha de opt-out sob demanda (o cron faz isso via `ensureForCustomer`; útil
pré-criar para os cenários 5/6/7) e ler o token:

```sql
INSERT INTO customer_email_preferences (customer_id, org_id)
VALUES ('<customer_id>', '<org_id>')
ON CONFLICT (customer_id, org_id) DO NOTHING;

SELECT unsubscribe_token, post_service_enabled, birthday_enabled,
       inactivity_enabled, unsubscribed_all_at
FROM customer_email_preferences
WHERE customer_id = '<customer_id>' AND org_id = '<org_id>';
```

## 4. Bateria de testes manuais

`dedupe_key` por gatilho: `post_service:<service_id>` · `birthday:<customer_id>:<YYYY>`
· `inactivity:<customer_id>:<YYYY-MM>` (o `YYYY`/`YYYY-MM` é o dia-calendário
`America/Sao_Paulo`). O `dedupe_key` **não referencia** a linha de `campaigns` — apagar e
recriar a campanha do mesmo gatilho **não** reenvia para quem já recebeu.

| Cenário | Como testar | Confirma |
|---|---|---|
| 1 — Feature desligada | `CAMPAIGNS_ENABLED` ausente/`false` → tick | Job `campaign-triggers` com `status: ok`; **zero** linhas novas em `campaign_sends`; log `Campanhas desabilitadas (CAMPAIGNS_ENABLED) — no-op.` |
| 2 — Canal de e-mail desligado | `CAMPAIGNS_ENABLED=true`, mas `NOTIFICATIONS_EMAIL_ENABLED != true` **ou** `RESEND_API_KEY` vazia → tick | Log `Canal de e-mail desligado — no-op (não reivindica o tick).`; zero linhas; `cron_job_state` **não** ganha/atualiza a linha `campaign-triggers` (Gate C não foi reivindicado) |
| 3 — Org sem campanha do gatilho | Cliente com aniversário hoje numa org cujo gatilho `birthday` **não tem campanha** (`DELETE FROM campaigns WHERE org_id='<org_id>' AND trigger='birthday';`) ou com a campanha `enabled=false` → sonda `birthday` (§5) | A sonda **não** retorna a linha do cliente (`INNER JOIN campaigns cp ... AND cp.trigger='birthday' AND cp.enabled = true`). Com a chave Resend: tick não grava nada para esse gatilho |
| 4 — Gatilho ligado, cliente sem opt-out | Seed §3 (campanha `birthday` `enabled=true`, cliente com aniversário hoje, `enabled=true`, e-mail válido, **sem** linha em `customer_email_preferences`), `RESEND_API_KEY` de teste → tick | 1 linha em `campaign_sends` (`trigger=birthday`, `attempt=1`), `status=sent` (`sent_at` preenchido) — ou `status=failed` (`sent_at NULL`, `error` redigido) se o Resend rejeitar o endereço; **e** passa a existir a linha `customer_email_preferences` do cliente com `unsubscribe_token` |
| 5 — Opt-out global | Cliente do cenário 4, `UPDATE customer_email_preferences SET unsubscribed_all_at = now() WHERE customer_id='<customer_id>' AND org_id='<org_id>';` → rodar as **3** sondas (§5) | Nenhuma das 3 sondas retorna o cliente (`p.unsubscribed_all_at IS NULL` quebra em todas). Tick → nada gravado para ele |
| 6 — Opt-out por gatilho | `UPDATE customer_email_preferences SET birthday_enabled = false WHERE customer_id='<customer_id>' AND org_id='<org_id>';` (os outros dois seguem `true`) → 3 sondas | Sonda `birthday` **não** retorna o cliente; sondas `post_service` e `inactivity` **retornam** (se elegíveis pelos seeds). `unsubscribed_all_at` continua `NULL`; `unsubscribedAll` no endpoint continua `false` |
| 7 — Opt-out ENTRE a 1ª tentativa e o retry | Seed manual de uma linha `failed attempt=1` (abaixo); depois `UPDATE customer_email_preferences SET birthday_enabled=false ...`; → tick | `findRetriable` **não** seleciona a linha (o predicado de opt-out está nele também — LGPD). `SELECT attempt,status FROM campaign_sends WHERE dedupe_key = 'birthday:<customer_id>:<YYYY>' ORDER BY attempt;` → **nenhuma** linha `attempt=2` |
| 8 — Dedupe | Com a linha `sent`/`failed` do cenário 4 já existindo (ou seed manual de uma `sent`), rodar o tick de novo (após `DELETE FROM cron_job_state WHERE job_name='campaign-triggers';`) | A 2ª execução **não** cria linha nova para o mesmo `dedupe_key` (`NOT EXISTS` por `dedupe_key` — qualquer linha, não só a última). `sent` count = 0 no log. Vale também **apagar e recriar** a campanha `birthday` no meio: o dedupe herdado impede o reenvio |
| 9 — Org suspensa | `UPDATE organizations SET suspended_at = now() WHERE id = '<org_id>';` → 3 sondas | Nenhuma sonda retorna clientes da org (`INNER JOIN organizations ... suspended_at IS NULL` nos 3 helpers **e** no `findRetriable`). Reverter: `SET suspended_at = NULL` |
| 10 — E-mail com whitespace legado | `UPDATE customers SET email = '  ' WHERE id = '<customer_id>';` (ou com `E'\n'`) → sonda do gatilho elegível | Sonda **não** retorna o cliente (`btrim(c.email) <> ''`). Reverter o e-mail depois |
| 11 — Endpoint público de preferências / opt-out | `GET /public/campaigns/preferences/<token>` · `POST /public/campaigns/unsubscribe/<token>` (body opcional `{ "trigger": "birthday" }`) | `GET` válido → `200` `{ orgName, postServiceEnabled, birthdayEnabled, inactivityEnabled, unsubscribedAll }` — **sem** `orgId` nem outro id. Token inválido (`GET` ou `POST`) → `404` genérico (`CAMPAIGN_PREFERENCES_NOT_FOUND`). `POST` **sem body** 2x → `200` `{ ok: true }` nas duas (idempotente); `unsubscribed_all_at` preenchido e **preservado** no 1º instante (COALESCE). `POST` com `{ "trigger": "birthday" }` → só `birthday_enabled` vira `false`. `trigger` fora do enum → `400`. **Sem gate de `CAMPAIGNS_ENABLED`** — funciona com a feature desligada |
| 12 — Copy custom + auditoria (CRUD) | Criar/editar via `POST /orgs/:orgId/campaigns` ou `PATCH /orgs/:orgId/campaigns/:id` (dono). `id` da campanha: `SELECT id FROM campaigns WHERE org_id='<org_id>' AND trigger='birthday';`. `subject`: `"Parabéns, {{customerName}}!"`. `body`: doc Tiptap-JSON, ex. `{ "type": "doc", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "Olá, {{customerName}}!" } ] } ] }` | Cenário 4 passa a usar esse assunto interpolado (`{{customerName}}`/`{{orgName}}` só; CR/LF colapsado; corte em 200) e esse corpo (interpolado **no renderer**, nos nós `text`). `subject: ""` → normaliza p/ `NULL` → volta ao default autoral (fallback **por campo**). `body: null` → volta ao doc default. `POST` para um gatilho que já tem campanha → `409` `CAMPAIGN_TRIGGER_ALREADY_USED`. Cada create/update/delete grava 1 linha em `audit_logs`: `action = campaign_settings_updated`, `entity_type = campaign`, `metadata = { operation: "created"|"updated"|"deleted", trigger, campaignId, changed }` — `changed` são **nomes de campo**, o texto de `subject`/`body` **nunca** aparece. Conferir: `SELECT action, metadata FROM audit_logs WHERE org_id='<org_id>' ORDER BY created_at DESC;` |
| 13 — `campaignsEnabled` no GET | `GET /orgs/:orgId/campaigns` (qualquer membro) com `CAMPAIGNS_ENABLED` alternando | Retorno `{ campaigns, campaignsEnabled, availableTriggers, defaults }`. `campaignsEnabled` reflete o env (mesmo gate do job); `true` → o front esconde o banner "em preparação". `availableTriggers` = gatilhos ainda **sem** campanha. `defaults` = copy autoral por gatilho (`subject` string + `body` Tiptap-JSON, tokens **não** interpolados). O `GET` nunca cria linha |
| 14 — Corpo com nó/atributo fora da allowlist | `POST`/`PATCH` com `body` contendo um `iframe`, uma `table`, um `heading` com `attrs.level = 1`, ou um `link` com `href: "javascript:alert(1)"` — **um caso por vez**. Para o teto de imagens: 11 nós `image` cujo `src` use o **prefixo real do bucket** (`<SUPABASE_URL>/storage/v1/object/public/campaign-images/<org_id>/a.png`, `b.png`, …) — o walker só compara o prefixo como string, não verifica se o objeto existe. Se `SUPABASE_URL` estiver vazia, qualquer `src` http(s) serve para esse caso | `400` com `code = CAMPAIGN_INVALID_BODY` e `message = "Invalid campaign body: <razão>"` — `<razão>` ∈ { `unsupported node type`, `unsupported heading level`, `unsupported url scheme`, `too many image nodes` } (`AllExceptionsFilter` repassa `exception.message`). A campanha **não** é criada/alterada |
| 15 — Upload de imagem + âncora de bucket | `POST /orgs/:orgId/campaigns/images` (dono; multipart, **campo `file`**, jpeg/png/webp/gif ≤ 2 MB) → `{ url }`. Depois `POST`/`PATCH` de campanha com um nó `image` cujo `src` = essa URL; e outro teste com `src` de domínio externo | Upload → `200 { url }` com URL pública `<SUPABASE_URL>/storage/v1/object/public/campaign-images/<org_id>/<uuid>.<ext>` (**nada gravado no banco**; o objeto aparece no bucket `campaign-images` do Storage). `image.src` = URL do bucket → corpo aceito. `image.src` fora do prefixo do bucket → `400` `code = CAMPAIGN_INVALID_BODY`, `message = "Invalid campaign body: image src must be an uploaded campaign image"` (quando `SUPABASE_URL` está setado). Arquivo com mime não suportado **ou** > 2 MB → `400` do `ParseFilePipe` (**não** `415`; o code `CAMPAIGN_IMAGE_UNSUPPORTED_TYPE`/415 é defesa interna do use-case, inalcançável via HTTP porque o pipe barra antes) |

### Seed manual da linha `failed` (cenário 7) e de uma linha `sent` (cenário 8)

```sql
-- 7: linha 'failed' attempt=1 (CHECK campaign_sends_sent_at_check: sent_at NULL em 'failed')
INSERT INTO campaign_sends (org_id, customer_id, trigger, status, attempt, dedupe_key, sent_at)
VALUES ('<org_id>', '<customer_id>', 'birthday', 'failed', 1,
        'birthday:<customer_id>:' || to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY'),
        NULL);

-- 8: linha 'sent' (sent_at NOT NULL em 'sent')
INSERT INTO campaign_sends (org_id, customer_id, trigger, status, attempt, dedupe_key, sent_at)
VALUES ('<org_id>', '<customer_id>', 'birthday', 'sent', 1,
        'birthday:<customer_id>:' || to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY'),
        now());
```

## 5. Sondas SQL dos predicados (o núcleo da verificação de opt-out)

Cada sonda é a tradução literal do SQL do repositório correspondente. Rode contra o
banco local; a lista de linhas retornada é exatamente o conjunto de alvos que o cron
enviaria.

### Filtro comum aos 3 gatilhos (LGPD)

Todos os helpers aplicam, além do predicado específico do gatilho:

- `INNER JOIN campaigns cp ON cp.org_id = c.org_id AND cp.trigger = '<gatilho>' AND cp.enabled = true`
  — org sem campanha daquele gatilho, ou com a campanha `enabled = false`, **nunca**
  dispara. `cp.subject` e `cp.body` são a copy custom (NULL = default autoral).
- `INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL`.
- `c.enabled = true` e `btrim(c.email) <> ''`.
- `LEFT JOIN customer_email_preferences p` com
  `(p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.<gatilho>_enabled = true))`
  — sem linha = consente; opt-out global **ou** por gatilho exclui.
- `NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = <expr>)` — anti-join
  por **qualquer** linha com aquele `dedupe_key`.

### Sonda `birthday`

```sql
WITH ref AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
SELECT c.org_id, c.id AS customer_id, c.name, c.email,
       'birthday:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY') AS dedupe_key
FROM customers c
INNER JOIN campaigns cp
  ON cp.org_id = c.org_id AND cp.trigger = 'birthday' AND cp.enabled = true
INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
LEFT JOIN customer_email_preferences p
  ON p.customer_id = c.id AND p.org_id = c.org_id
WHERE c.enabled = true
  AND btrim(c.email) <> ''
  AND EXTRACT(MONTH FROM c.birth_date)::int = EXTRACT(MONTH FROM (SELECT d FROM ref))::int
  AND EXTRACT(DAY   FROM c.birth_date)::int = EXTRACT(DAY   FROM (SELECT d FROM ref))::int
  AND (p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.birthday_enabled = true))
  AND NOT EXISTS (
    SELECT 1 FROM campaign_sends cs
    WHERE cs.dedupe_key = 'birthday:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY')
  );
```

### Sonda `post_service`

```sql
SELECT c.org_id, c.id AS customer_id, c.name, c.email, s.id AS service_id,
       'post_service:' || s.id AS dedupe_key
FROM customers c
INNER JOIN campaigns cp
  ON cp.org_id = c.org_id AND cp.trigger = 'post_service' AND cp.enabled = true
INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
INNER JOIN services s
  ON s.customer_id = c.id AND s.org_id = c.org_id
  AND s.performed_at >= now() - INTERVAL '48 hours'
  AND s.performed_at <  now() - INTERVAL '24 hours'
  AND s.canceled_at IS NULL
LEFT JOIN customer_email_preferences p
  ON p.customer_id = c.id AND p.org_id = c.org_id
WHERE c.enabled = true
  AND btrim(c.email) <> ''
  AND (p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.post_service_enabled = true))
  AND NOT EXISTS (
    SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = 'post_service:' || s.id
  );
```

### Sonda `inactivity`

O `GROUP BY` inclui **`cp.id`** (PK da campanha) porque `cp.body` (jsonb) não tem
operador de igualdade — é o que o repositório faz (`findInactivityTargets`). A janela
vem de `cp.inactivity_months` da campanha da própria org.

```sql
WITH ref AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
SELECT c.org_id, c.id AS customer_id, c.name, c.email,
       'inactivity:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY-MM') AS dedupe_key
FROM customers c
INNER JOIN campaigns cp
  ON cp.org_id = c.org_id AND cp.trigger = 'inactivity' AND cp.enabled = true
INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL
INNER JOIN services s
  ON s.customer_id = c.id AND s.org_id = c.org_id AND s.canceled_at IS NULL
LEFT JOIN customer_email_preferences p
  ON p.customer_id = c.id AND p.org_id = c.org_id
WHERE c.enabled = true
  AND btrim(c.email) <> ''
  AND (p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.inactivity_enabled = true))
  AND NOT EXISTS (
    SELECT 1 FROM campaign_sends cs
    WHERE cs.dedupe_key = 'inactivity:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY-MM')
  )
GROUP BY c.org_id, c.id, c.name, c.email, cp.id, cp.inactivity_months
HAVING (MAX(s.performed_at) AT TIME ZONE 'UTC') <
       ((SELECT d FROM ref)::date - (cp.inactivity_months || ' months')::interval);
```

### Sonda do retry (`findRetriable` — opt-out entre a 1ª tentativa e o retry, cenário 7)

O passe de retry só reprocessa uma linha cuja **última** tentativa continua `failed`
(`attempt < 3`, sem linha `sent`/`bounced` e sem `attempt` maior para o mesmo
`dedupe_key`), **e** que ainda passa no mesmo filtro de opt-out. O `LEFT JOIN campaigns cp`
(por `org_id` + `trigger`) traz a copy custom para o reenvio; **campanha deletada** entre
a tentativa e o retry ⇒ `cp.subject`/`cp.body` `NULL` ⇒ o retry sai com o **default
autoral** e a linha **não** é descartada. O `enabled` da campanha (config, não
consentimento) **não** é re-checado aqui; o opt-out do **cliente** é.

```sql
SELECT cs.id, cs.dedupe_key, cs.attempt, cs.trigger,
       cp.subject AS subject_override, cp.body AS body
FROM campaign_sends cs
INNER JOIN customers c ON c.id = cs.customer_id AND c.org_id = cs.org_id
INNER JOIN organizations o ON o.id = cs.org_id AND o.suspended_at IS NULL
LEFT JOIN campaigns cp ON cp.org_id = cs.org_id AND cp.trigger = cs.trigger
LEFT JOIN customer_email_preferences p
  ON p.customer_id = cs.customer_id AND p.org_id = cs.org_id
WHERE cs.status = 'failed'
  AND cs.attempt < 3
  AND c.enabled = true
  AND btrim(c.email) <> ''
  AND (
    p.id IS NULL
    OR (p.unsubscribed_all_at IS NULL
        AND CASE cs.trigger
              WHEN 'post_service' THEN p.post_service_enabled
              WHEN 'birthday'     THEN p.birthday_enabled
              WHEN 'inactivity'   THEN p.inactivity_enabled
            END = true)
  )
  AND NOT EXISTS (SELECT 1 FROM campaign_sends t
                  WHERE t.dedupe_key = cs.dedupe_key AND t.status IN ('sent','bounced'))
  AND NOT EXISTS (SELECT 1 FROM campaign_sends t
                  WHERE t.dedupe_key = cs.dedupe_key AND t.attempt > cs.attempt);
```

- **Cenário 7**: com `birthday_enabled = false` no cliente, esta sonda **não** retorna a
  linha `failed` seedada — logo o tick não insere `attempt=2`.
- **Cenário "campanha deletada ⇒ retry com default"**: com a linha `failed attempt=1`
  seedada, `DELETE FROM campaigns WHERE org_id='<org_id>' AND trigger='birthday';` — a
  sonda **ainda retorna** a linha, agora com `subject_override` e `body` `NULL` (fallback
  para a copy default autoral no reenvio). Reverter recriando a campanha (seed §3).

## Reset entre execuções

`campaign_sends` e `customer_email_preferences` são **append-only / consentimento** —
NUNCA `UPDATE`/`DELETE` neles como parte de um teste de comportamento. Para **limpar o
ambiente** entre execuções, tudo bem:

```sql
DELETE FROM cron_job_state             WHERE job_name = 'campaign-triggers';       -- libera o Gate C
DELETE FROM campaign_sends             WHERE dedupe_key LIKE 'birthday:%';         -- (ou 'post_service:%' / 'inactivity:%')
DELETE FROM customer_email_preferences WHERE customer_id = '<customer_id>';        -- reseta opt-out + token
DELETE FROM campaigns                  WHERE org_id = '<org_id>';                  -- remove as campanhas da org (volta p/ "sem campanha")
UPDATE organizations SET suspended_at = NULL WHERE id = '<org_id>';               -- se o cenário 9 rodou
```

Reverta também `customers.email` / `customers.birth_date` / `services.performed_at` se
os alterou nos seeds. Objetos no bucket `campaign-images` (cenário 15) podem ser
apagados pelo Storage do Supabase Studio local — o backend não os remove.

## Notas de gotcha

- **Sem `RESEND_API_KEY` real, o Gate B barra antes do envio** — `IEmailSender.send` é
  no-op (`false`) e o `RunCampaignTriggersUseCase` **não grava linha** nenhuma. Para
  exercitar os gatilhos de ponta a ponta é preciso uma chave de teste do Resend; sem
  ela, só os cenários de SQL/flag/HTTP (1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15 e a
  parte de auditoria do 12) são verificáveis.
- **`referenceDate` de aniversário/inatividade é o dia-calendário `America/Sao_Paulo`**
  fixado como `Date` à meia-noite UTC. Perto da virada do dia em UTC, o "hoje" do
  gatilho pode divergir do `now()` do banco — as sondas usam
  `(now() AT TIME ZONE 'America/Sao_Paulo')::date` para casar com o use-case.
- **Após um run efetivo o Gate C trava por 20h sem log.** Se um segundo tick "não faz
  nada" e não há log de skip, quase certamente é `throttled` — limpe `cron_job_state`.
- **Gate B (canal desligado) NÃO reivindica o tick**; Gate A (flag) também não. Só um
  run que passa dos 3 gates grava/atualiza `cron_job_state`.
- **`campaign_sends` é append-only puro (D2, mesmo espírito do caixa, ADR-0010):** um
  retry é uma **linha nova** `attempt+1`; não há status `pending`; `bounced` só será
  escrito por webhook Resend futuro, nunca por este job. UNIQUE
  `(dedupe_key, attempt, status)` + `ON CONFLICT DO NOTHING` no writer. **Recriar uma
  campanha do mesmo gatilho NÃO reenvia** — o `dedupe_key` não referencia a linha de
  `campaigns` (dedupe herdado; comunicado no `ConfirmDialog` de exclusão no frontend).
- **Entrega OK mas o INSERT `sent` falha → nada é gravado** (o job só loga um warn) —
  de propósito, para o `findRetriable` não casar e reenviar um e-mail já entregue. O
  dedupe re-seleciona o alvo no próximo run (duplicata possível, preferível ao
  reenvio).
- **Corpo é Tiptap-JSON com allowlist FECHADA (`validateCampaignBody`, roda antes de
  gravar):** nós `doc/paragraph/text/hardBreak/bulletList/orderedList/listItem/heading
  (level 2 ou 3)/image (attrs só `src` + `alt`)`; marcas só em `text`:
  `bold/italic/link`. `link.href`/`image.src` só `http(s)` (rejeita `javascript:`,
  `data:`, `vbscript:`, protocolo-relativo, relativo); `target`/`rel` do link são
  normalizados. Tetos: profundidade ≤ 5, ≤ 10 nós `image`, ≤ 65536 bytes serializados.
  Qualquer violação → `400 CAMPAIGN_INVALID_BODY`. O renderer (`render-campaign-body.tsx`)
  emite React Email e **nunca** usa `dangerouslySetInnerHTML`.
- **Assunto continua texto puro:** interpolação de `{{customerName}}`/`{{orgName}}` em
  passe único por regex allowlist, CR/LF colapsado em espaço e corte em 200 chars
  **depois** de interpolar, antes do provider (o escape do React Email não alcança o
  campo `subject` — risco de header injection). Fallback é **por campo** e independente:
  `subject` custom + `body` `NULL` usa assunto custom + corpo default. `""` no `subject`
  → `NULL` (normalização no use-case + CHECK do banco rejeita string só de whitespace).
- **Bucket `campaign-images` é PÚBLICO de propósito** (migration 0068): cliente de
  e-mail não autentica no Supabase, então signed URL (que expira) não renderiza. O
  `UploadCampaignImageUseCase` **não grava no banco** — a URL pública vive dentro do
  `body` jsonb da campanha, e o walker re-valida no create/update que `image.src` começa
  com o prefixo do bucket (`SUPABASE_URL` + `/storage/v1/object/public/campaign-images/`).
- **Upload rejeitado pelo `ParseFilePipe` retorna `400`, não `415`.** O code
  `CAMPAIGN_IMAGE_UNSUPPORTED_TYPE` (415) existe como defesa interna do use-case, mas o
  `ParseFilePipe` (`MaxFileSizeValidator` + `FileTypeValidator`) barra mime/size antes de
  o use-case rodar.
- **`unsubscribe_token` não expira e não rotaciona** (DEFAULT `encode(gen_random_bytes(32),'hex')`,
  64 chars hex — não é UUID). É criado sob demanda pelo cron (`ensureForCustomer`) ou
  pelos seeds. Invalidá-lo quebraria o descadastro de e-mails já entregues (falha de
  LGPD).
- **Os predicados de opt-out não têm teste automatizado** (sem harness de integração de
  DB no backend). Esta bateria — em especial as sondas da §5 — É a verificação. Se
  `drizzle-campaign-target.repository.ts` ou `findRetriable` mudarem, re-rode tudo e
  atualize as sondas.
- **`CAMPAIGNS_ENABLED=true` em produção só depois das telas do Bloco B publicadas** —
  o link de descadastro precisa de destino vivo (`/preferencias-email/<token>`).

## Por que esta bateria não é opcional

O módulo `campaigns` concentra o risco em código que os unit tests **não** cobrem:

- Todo o predicado de seleção e de opt-out (LGPD) está em SQL cru; os `.spec.ts` do
  módulo testam `resolveCampaignCopy`, `validateCampaignBody`, `buildDedupeKey`,
  `redactEmail` e o `RunCampaignTriggersUseCase` **com o repositório mockado** — nenhum
  toca o SQL real.
- O `findRetriable` replica o filtro de opt-out num segundo lugar; um drift entre ele e
  os helpers de `CampaignTarget` só aparece rodando as sondas lado a lado.
- Retirada de consentimento (`unsubscribed_all_at`, `<trigger>_enabled`) tem valor
  jurídico: um falso negativo aqui é um e-mail enviado a quem pediu para sair.
