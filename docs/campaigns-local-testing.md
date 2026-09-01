# Campanhas de e-mail por gatilho — teste local

Guia operacional pra testar o módulo `modules/campaigns` (T6 — gatilhos
pós-atendimento / aniversário / inatividade, opt-out por cliente (LGPD), copy custom
por org, endpoint público de descadastro) contra o Postgres local do Supabase, sem
depender de e-mail real. Racional das decisões em
[`.memory/adr/0025-campanhas-email-por-gatilho.md`](../.memory/adr/0025-campanhas-email-por-gatilho.md).

> **Por que este guia existe:** os predicados de seleção e de opt-out das campanhas
> vivem em **SQL cru** dentro de `drizzle-campaign-target.repository.ts` e
> `drizzle-campaign-send.repository.ts` (`findRetriable`). O backend **não tem harness
> de integração de banco**, então esses predicados **não têm cobertura automatizada**.
> Esta bateria manual **é** a verificação. Se qualquer predicado mudar, re-rode-a.

## O que dá para exercitar sem uma chave real do Resend

`ICampaignMailer.sendCampaign` delega ao `MailService` central; sem `RESEND_API_KEY` o
sender é no-op e devolve `false` (engolido pelo `dispatch`). Mas o
`RunCampaignTriggersUseCase` **checa o canal de e-mail no Gate B e pula o job inteiro
antes de reivindicar o tick** — logo, sem chave **nenhuma linha `campaign_sends` é
gravada** e os 3 gatilhos não rodam de ponta a ponta.

| Precisa de chave Resend (teste) | Só flag / log / HTTP / SQL |
|---|---|
| 4 (envio real do gatilho), 8 (dedupe — ou seed manual de uma linha `sent`), parte "assunto interpolado" do 12 | 1, 2, 13 (flag + log) · 3, 5, 6, 7, 9, 10 (sondas SQL dos predicados) · 11 e parte "auditoria" do 12 (HTTP + DB, o endpoint público não envia e-mail) |

Sem chave, os predicados de seleção/opt-out se verificam rodando as **sondas SQL**
(seção 5) diretamente — elas espelham linha a linha o SQL dos repositórios.

## Pré-requisitos

- Stack local do Supabase no ar: `pnpm db:start` (`npx supabase start`).
- Migrations aplicadas: `pnpm --filter backend db:migrate` (precisa das `0061`,
  `0062`, `0063` e `0065`).
- Backend rodando: `pnpm --filter backend dev` (porta `3001`; dentro do Claude Code o
  processo `backend` de `.claude/launch.json`).
- `apps/backend/.env` com pelo menos `CRON_SECRET` preenchida.
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
| `FRONTEND_URL` | `http://localhost:3000` | Base do link de descadastro: `${FRONTEND_URL}/preferencias-email/<token>` (rota frontend F3) |
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

Ligar os 3 gatilhos para a org (sem esta linha, INNER JOIN → org nunca dispara):

```sql
INSERT INTO org_campaign_settings
  (org_id, post_service_enabled, birthday_enabled, inactivity_enabled, inactivity_months)
VALUES ('<org_id>', true, true, true, 6)
ON CONFLICT (org_id) DO UPDATE SET
  post_service_enabled = EXCLUDED.post_service_enabled,
  birthday_enabled     = EXCLUDED.birthday_enabled,
  inactivity_enabled   = EXCLUDED.inactivity_enabled,
  inactivity_months    = EXCLUDED.inactivity_months;
```

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
`America/Sao_Paulo`).

| Cenário | Como testar | Confirma |
|---|---|---|
| 1 — Feature desligada | `CAMPAIGNS_ENABLED` ausente/`false` → tick | Job `campaign-triggers` com `status: ok`; **zero** linhas novas em `campaign_sends`; log `Campanhas desabilitadas (CAMPAIGNS_ENABLED) — no-op.` |
| 2 — Canal de e-mail desligado | `CAMPAIGNS_ENABLED=true`, mas `NOTIFICATIONS_EMAIL_ENABLED != true` **ou** `RESEND_API_KEY` vazia → tick | Log `Canal de e-mail desligado — no-op (não reivindica o tick).`; zero linhas; `cron_job_state` **não** ganha/atualiza a linha `campaign-triggers` (Gate C não foi reivindicado) |
| 3 — Org sem `org_campaign_settings` | Cliente com aniversário hoje numa org **sem** linha de settings (`DELETE FROM org_campaign_settings WHERE org_id = '<org_id>';`) → sonda `birthday` (§5) | A sonda **não** retorna a linha do cliente (INNER JOIN com `org_campaign_settings`). Com a chave Resend: tick não grava nada para essa org |
| 4 — Gatilho ligado, cliente sem opt-out | Seed §3 (birthday hoje, `enabled=true`, e-mail válido, **sem** linha em `customer_email_preferences`), `RESEND_API_KEY` de teste → tick | 1 linha em `campaign_sends` (`trigger=birthday`, `attempt=1`), `status=sent` (`sent_at` preenchido) — ou `status=failed` (`sent_at NULL`, `error` redigido) se o Resend rejeitar o endereço; **e** passa a existir a linha `customer_email_preferences` do cliente com `unsubscribe_token` |
| 5 — Opt-out global | Cliente do cenário 4, `UPDATE customer_email_preferences SET unsubscribed_all_at = now() WHERE customer_id='<customer_id>' AND org_id='<org_id>';` → rodar as **3** sondas (§5) | Nenhuma das 3 sondas retorna o cliente (`p.unsubscribed_all_at IS NULL` quebra em todas). Tick → nada gravado para ele |
| 6 — Opt-out por gatilho | `UPDATE customer_email_preferences SET birthday_enabled = false WHERE customer_id='<customer_id>' AND org_id='<org_id>';` (os outros dois seguem `true`) → 3 sondas | Sonda `birthday` **não** retorna o cliente; sondas `post_service` e `inactivity` **retornam** (se elegíveis pelos seeds). `unsubscribed_all_at` continua `NULL`; `unsubscribedAll` no endpoint continua `false` |
| 7 — Opt-out ENTRE a 1ª tentativa e o retry | Seed manual de uma linha `failed attempt=1` (abaixo); depois `UPDATE customer_email_preferences SET birthday_enabled=false ...`; → tick | `findRetriable` **não** seleciona a linha (o predicado de opt-out está nele também — LGPD). `SELECT attempt,status FROM campaign_sends WHERE dedupe_key = 'birthday:<customer_id>:<YYYY>' ORDER BY attempt;` → **nenhuma** linha `attempt=2` |
| 8 — Dedupe | Com a linha `sent`/`failed` do cenário 4 já existindo (ou seed manual de uma `sent`), rodar o tick de novo (após `DELETE FROM cron_job_state WHERE job_name='campaign-triggers';`) | A 2ª execução **não** cria linha nova para o mesmo `dedupe_key` (`NOT EXISTS` por `dedupe_key` — qualquer linha, não só a última). `sent` count = 0 no log |
| 9 — Org suspensa | `UPDATE organizations SET suspended_at = now() WHERE id = '<org_id>';` → 3 sondas | Nenhuma sonda retorna clientes da org (INNER JOIN `organizations ... suspended_at IS NULL` nos 3 helpers **e** no `findRetriable`). Reverter: `SET suspended_at = NULL` |
| 10 — E-mail com whitespace legado | `UPDATE customers SET email = '  ' WHERE id = '<customer_id>';` (ou com `E'\n'`) → sonda do gatilho elegível | Sonda **não** retorna o cliente (`btrim(c.email) <> ''`). Reverter o e-mail depois |
| 11 — Endpoint público de preferências / opt-out | `GET /public/campaigns/preferences/<token>` · `POST /public/campaigns/unsubscribe/<token>` (body opcional `{ "trigger": "birthday" }`) | `GET` válido → `200` `{ orgName, postServiceEnabled, birthdayEnabled, inactivityEnabled, unsubscribedAll }` — **sem** `orgId` nem outro id. Token inválido (`GET` ou `POST`) → `404` genérico (`CAMPAIGN_PREFERENCES_NOT_FOUND`). `POST` **sem body** 2x → `200` `{ ok: true }` nas duas (idempotente); `unsubscribed_all_at` preenchido e **preservado** no 1º instante (COALESCE). `POST` com `{ "trigger": "birthday" }` → só `birthday_enabled` vira `false`. `trigger` fora do enum → `400` |
| 12 — Copy custom + auditoria | `PUT /orgs/:orgId/campaign-settings` (dono; body precisa dos 4 obrigatórios: `postServiceEnabled`, `birthdayEnabled`, `inactivityEnabled`, `inactivityMonths`) com `"birthdaySubject": "Parabéns, {{customerName}}!"` | Cenário 4 passa a usar esse assunto interpolado (`{{customerName}}`/`{{orgName}}` só; sem CR/LF; corte em 200). `"birthdaySubject": ""` → normaliza p/ `NULL` → volta ao default autoral (`CAMPAIGN_DEFAULT_COPY`, fallback **por campo**). Cada `PUT` grava 1 linha `campaign_settings_updated` em `audit_logs` (`entity_type = org_campaign_settings`; `metadata.changed` = nomes de campo, **nunca** o texto) — conferir em `SELECT action, metadata FROM audit_logs WHERE org_id = '<org_id>' ORDER BY created_at DESC;` ou no painel `/admin` |
| 13 — `campaignsEnabled` no GET | `GET /orgs/:orgId/campaign-settings` (qualquer membro) com `CAMPAIGNS_ENABLED` alternando | O campo `campaignsEnabled` do retorno reflete o env (mesmo gate do job). `true` → o front esconde o banner "em preparação". O `GET` nunca cria linha; sem linha devolve os defaults (`*Enabled: false`, `inactivityMonths: 6`, 6 textos `null`) + `defaults` |

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

- `INNER JOIN org_campaign_settings ocs ON ocs.org_id = c.org_id AND ocs.<trigger>_enabled = true`
  — org sem linha, ou com o gatilho `false`, **nunca** dispara.
- `INNER JOIN organizations o ON o.id = c.org_id AND o.suspended_at IS NULL`.
- `c.enabled = true` e `btrim(c.email) <> ''`.
- `LEFT JOIN customer_email_preferences p` com
  `(p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.<trigger>_enabled = true))`
  — sem linha = consente; opt-out global **ou** por gatilho exclui.
- `NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.dedupe_key = <expr>)` — anti-join
  por **qualquer** linha com aquele `dedupe_key`.

### Sonda `birthday`

```sql
WITH ref AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
SELECT c.org_id, c.id AS customer_id, c.name, c.email,
       'birthday:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY') AS dedupe_key
FROM customers c
INNER JOIN org_campaign_settings ocs
  ON ocs.org_id = c.org_id AND ocs.birthday_enabled = true
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
INNER JOIN org_campaign_settings ocs
  ON ocs.org_id = c.org_id AND ocs.post_service_enabled = true
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

```sql
WITH ref AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
SELECT c.org_id, c.id AS customer_id, c.name, c.email,
       'inactivity:' || c.id || ':' || to_char((SELECT d FROM ref), 'YYYY-MM') AS dedupe_key
FROM customers c
INNER JOIN org_campaign_settings ocs
  ON ocs.org_id = c.org_id AND ocs.inactivity_enabled = true
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
GROUP BY c.org_id, c.id, c.name, c.email, ocs.inactivity_months
HAVING (MAX(s.performed_at) AT TIME ZONE 'UTC') <
       ((SELECT d FROM ref)::date - (ocs.inactivity_months || ' months')::interval);
```

### Sonda do retry (`findRetriable` — opt-out entre a 1ª tentativa e o retry, cenário 7)

O passe de retry só reprocessa uma linha cuja **última** tentativa continua `failed`
(`attempt < 3`, sem linha `sent`/`bounced` e sem `attempt` maior para o mesmo
`dedupe_key`), **e** que ainda passa no mesmo filtro de opt-out. A flag `*_enabled` da
**org** não é re-checada aqui (é config, não consentimento); a do **cliente** é.

```sql
SELECT cs.id, cs.dedupe_key, cs.attempt, cs.trigger
FROM campaign_sends cs
INNER JOIN customers c ON c.id = cs.customer_id AND c.org_id = cs.org_id
INNER JOIN organizations o ON o.id = cs.org_id AND o.suspended_at IS NULL
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

Cenário 7: com `birthday_enabled = false` no cliente, esta sonda **não** retorna a
linha `failed` seedada — logo o tick não insere `attempt=2`.

## Reset entre execuções

`campaign_sends` e `customer_email_preferences` são **append-only / consentimento** —
NUNCA `UPDATE`/`DELETE` neles como parte de um teste de comportamento. Para **limpar o
ambiente** entre execuções, tudo bem:

```sql
DELETE FROM cron_job_state          WHERE job_name = 'campaign-triggers';          -- libera o Gate C
DELETE FROM campaign_sends          WHERE dedupe_key LIKE 'birthday:%';            -- (ou 'post_service:%' / 'inactivity:%')
DELETE FROM customer_email_preferences WHERE customer_id = '<customer_id>';        -- reseta opt-out + token
DELETE FROM org_campaign_settings   WHERE org_id = '<org_id>';                     -- volta a org p/ "campanhas desligadas"
UPDATE organizations SET suspended_at = NULL WHERE id = '<org_id>';               -- se o cenário 9 rodou
```

Reverta também `customers.email` / `customers.birth_date` / `services.performed_at` se
os alterou nos seeds.

## Notas de gotcha

- **Sem `RESEND_API_KEY` real, o Gate B barra antes do envio** — `IEmailSender.send` é
  no-op (`false`) e o `RunCampaignTriggersUseCase` **não grava linha** nenhuma. Para
  exercitar os gatilhos de ponta a ponta é preciso uma chave de teste do Resend; sem
  ela, só os cenários de SQL/flag/HTTP (1, 2, 3, 5, 6, 7, 9, 10, 11, 13 e a parte de
  auditoria do 12) são verificáveis.
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
  `(dedupe_key, attempt, status)` + `ON CONFLICT DO NOTHING` no writer.
- **Entrega OK mas o INSERT `sent` falha → nada é gravado** (o job só loga um warn) —
  de propósito, para o `findRetriable` não casar e reenviar um e-mail já entregue. O
  dedupe re-seleciona o alvo no próximo run (duplicata possível, preferível ao
  reenvio).
- **Copy custom:** fallback é **por campo** e independente — `birthdaySubject` custom
  com `birthdayBody` `NULL` usa assunto custom + corpo default. `""` no `PUT` vira
  `NULL` (normalização no use-case + CHECK do banco rejeita string só de whitespace).
  Interpolação: só `{{customerName}}` e `{{orgName}}`, passe único por regex allowlist;
  assunto tem CR/LF removido e corte em 200 **depois** de interpolar.
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
  módulo testam `resolveCampaignCopy`, `buildDedupeKey`, `redactEmail` e o
  `RunCampaignTriggersUseCase` **com o repositório mockado** — nenhum toca o SQL real.
- O `findRetriable` replica o filtro de opt-out num segundo lugar; um drift entre ele e
  os helpers de `CampaignTarget` só aparece rodando as sondas lado a lado.
- Retirada de consentimento (`unsubscribed_all_at`, `<trigger>_enabled`) tem valor
  jurídico: um falso negativo aqui é um e-mail enviado a quem pediu para sair.
