# ADR-0025 — Campanhas de e-mail por gatilho: módulo próprio, opt-out por cliente, log append-only, gate por env

**Status:** Aceito
**Data:** 2026-09-01

## Contexto

O ASO já tinha e-mail transacional consolidado (ADR-0012: módulo `mail`, React Email,
`ResendEmailSender` gateado por env) e notificações in-app + e-mail best-effort
(`modules/notifications`, ADR-0012), além de um cron interno de tick único
(`POST /internal/cron/tick`, `CronSecretGuard`) e do mecanismo de self-throttle
`cron_job_state` (migration `0049`, ADR-0024). O que **não** existia: qualquer forma de
e-mail de marketing/relacionamento disparado por evento de negócio, o opt-out por
destinatário que a LGPD exige para esse tipo de mensagem (ADR-0018 Tier 2 listava
"opt-out em e-mail de notificação" como débito em aberto), e configuração de comunicação
por organização.

O T6 Bloco A entrega o **backend do MVP de campanhas de e-mail por gatilho**: três
gatilhos (`post_service`, `birthday`, `inactivity`), disparo por cron cross-org, copy
customizável por org e por gatilho, e a página pública de descadastro/preferências
(`/preferencias-email/:token`) — cujas **telas** (config do dono + página de preferências
do cliente) são o **Bloco B**, ainda não implementado.

As decisões abaixo foram aprovadas pelo usuário e são fáceis de reintroduzir errado numa
sessão futura que precise "mexer no envio de campanha", "rotacionar o token de
descadastro" ou "reusar o `NotificationService` para isso".

## Decisão

### 1. Módulo `campaigns` próprio — não estende `NotificationService`

`apps/backend/src/modules/campaigns/` (Clean Architecture, `CampaignsModule` importa
`ConfigModule`, `MailModule`, `CronJobStateModule`; exporta só `RunCampaignTriggersUseCase`,
registrado no `internal-cron.controller.ts` como `CRON_JOBS.CAMPAIGN_TRIGGERS`).

`NotificationService` é keyed em `users.id` (destinatário sempre uma conta da plataforma).
Campanhas alvejam **`customers`**, que não têm conta — reusá-lo exigiria distorcer o
contrato. O `campaigns` depende de `mail` (via `CampaignMailerMailServiceAdapter` sobre
`MailService.sendCampaignByTrigger`); **não há dependência circular** porque a porta
`ICampaignMailer` e o adapter ficam em `campaigns`, e `MailService` usa um union literal
inline (`CampaignTriggerName`) em vez de importar `CampaignTrigger` de volta.

### 2. D1 — opt-out por cliente em `customer_email_preferences` (migration `0061`)

Uma linha por `(customer_id, org_id)` — UNIQUE `customer_email_preferences_customer_org_uq`.
Flags booleanas por gatilho (`post_service_enabled` / `birthday_enabled` /
`inactivity_enabled`, default `true`) + `unsubscribed_all_at` (opt-out global,
`timestamptz` nullable). **Ausência de linha = o cliente não optou por sair de nada** —
é o estado inicial; o cron materializa a linha sob demanda (`ensureForCustomer`, `INSERT
... ON CONFLICT (customer_id, org_id) DO NOTHING`) para poder embutir o token no link, então
no regime estacionário a maioria dos clientes alvejados **tem** linha.

- **`unsubscribe_token`**: `text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')`
  (hex de 64 chars — **não** é UUID, nada de `ParseUUIDPipe`). **NÃO expira, NUNCA
  rotaciona.** Ele viaja dentro do link de descadastro de e-mails **já entregues**;
  invalidá-lo mataria o "unsubscribe" de uma mensagem já na caixa do cliente — falha de
  LGPD. Gerado só pelo DEFAULT do banco; `ensureForCustomer` faz `ON CONFLICT` sobre a
  unique de `(customer_id, org_id)`, **nunca** sobre o token.
- **FK COMPOSTA** `(customer_id, org_id) → customers(id, org_id)` (via
  `customers_id_org_id_uq`, migration `0052`) `ON DELETE CASCADE` — impede a preferência
  apontar para cliente de outra org. `org_id` também tem FK simples para `organizations`
  `ON DELETE CASCADE`. `customer_id` **não** tem FK simples.
- **RLS** habilitada com policy **só de SELECT** (`is_super_admin() OR is_org_member(org_id)`).
  Sem policy de INSERT/UPDATE/DELETE: toda escrita é via `DRIZZLE_ADMIN` (cron + endpoint
  público). `REVOKE ALL FROM anon, authenticated` como defesa em profundidade.
- **`updated_at` não tem trigger** — setado explicitamente (`updatedAt: new Date()`) em
  todo `UPDATE` do repositório. `unsubscribeAll` usa
  `COALESCE(unsubscribed_all_at, $now)` para preservar o **primeiro** instante de retirada
  de consentimento (valor jurídico) e ser idempotente.

### 3. Feature flags: gate por env + flags por gatilho por org — sem o módulo de Feature Flags (ADR-0009)

- **`CAMPAIGNS_ENABLED`** (env, global, controle do super_admin) — kill-switch. Nasce
  `false`.
- **`org_campaign_settings`** (migration `0062`, PK = `org_id`): `*_enabled` por gatilho
  (default **`false`**) + `inactivity_months` (`integer NOT NULL DEFAULT 6`, CHECK `BETWEEN
  1 AND 36`). **Ausência de linha = campanhas desligadas para a org** — as queries de
  gatilho fazem `INNER JOIN` com esta tabela, **nunca `LEFT`**. Nenhuma linha é criada por
  backfill; o dono liga explicitamente no Bloco B.
- **Não puxa o módulo de Feature Flags (ADR-0009)** — decisão explícita de escopo. A
  migração dos gates de env para o módulo de flags fica para quando ele existir.
- **Pré-requisito de ativação:** `CAMPAIGNS_ENABLED=true` **só** depois do Bloco B existir.
  Ligar antes = link de descadastro sem destino vivo = falha de LGPD.
- **O kill-switch para só o envio, nunca o descadastro.** `PublicCampaignsController`
  (`/public/campaigns/*`) **não** tem gate de `CAMPAIGNS_ENABLED`: links em e-mails já
  entregues continuam funcionando mesmo depois da flag ser desligada. Comportamento
  correto e deliberado.

### 4. D5 — copy custom por org e por gatilho, texto puro com allowlist

`org_campaign_settings` tem 6 colunas de texto NULLABLE
(`{post_service,birthday,inactivity}_{subject,body}`). CHECK no banco:
`col IS NULL OR (char_length(btrim(col, E' \t\n\r')) BETWEEN 1 AND 200/5000 AND
char_length(col) <= 200/5000)` — rejeita valor só de whitespace **e** limita o
comprimento bruto.

- **NULL = default autoral do produto** (`CAMPAIGN_DEFAULT_COPY` em
  `domain/campaign-copy.ts`, pt-BR, sem promessa comercial). Fallback **por campo e
  independente**: subject custom + body default é válido, e vice-versa
  (`resolveCampaignCopy`).
- **Corpo é TEXTO PURO, nunca HTML.** Renderizado como parágrafos `<Text>` do React Email
  (escapado por padrão — HTML colado vira texto visível). `dangerouslySetInnerHTML` é
  **proibido** nos três templates de campanha.
- **Interpolação só de `{{customerName}}` e `{{orgName}}`**, em **passe único** por regex
  allowlist (`/\{\{(customerName|orgName)\}\}/g`) — sem `replace` sequencial token a
  token, sem eval, sem template engine. Token desconhecido (`{{email}}`) fica literal.
- **Assunto**: depois da interpolação, `replace(/[\r\n]+/g, " ")` + `trim()` +
  `slice(0, 200)` **antes** de ir ao provider — o escape do React Email não alcança o
  campo `subject` (risco de header injection), e um template que passou no CHECK pode
  estourar 200 depois de `{{orgName}}` expandir. O mesmo string sanitizado alimenta
  provider + `<Heading>` + preheader.
- **Rodapé fixo, não editável pela org**: identificação do remetente ("você recebeu este
  e-mail porque é cliente de {orgName}") + link de descadastro, via a prop opcional
  aditiva **`footerOverride`** do `base-layout.tsx`. Transacionais permanecem
  byte-idênticos (a prop é `undefined` neles). O e-mail de campanha **não** afirma "possui
  uma conta no ASO" — o destinatário é cliente da org, não da plataforma.
- **`org_campaign_settings` não é `DRIZZLE_ADMIN`-only.** A migration `0062` cria policies
  de INSERT e UPDATE para `is_super_admin() OR is_org_owner(org_id)` (com `WITH CHECK`
  espelhando o `USING`, porque `org_id` é PK e chave de tenancy ao mesmo tempo). O caminho
  de escrita por owner **já existe no banco**; nenhum caminho de aplicação o exercita
  ainda — o upsert das colunas de texto é Bloco B, o Bloco A só lê.

### 5. D2 — `campaign_sends` (migration `0063`): log append-only, sem FK, sem RLS

Enums novos: `campaign_trigger_type` (`post_service | birthday | inactivity`) e
`campaign_send_status` (`sent | failed | bounced` — **sem `pending`**).

- **Uma linha terminal por tentativa**, inserida **depois** da chamada ao sender; nunca
  `UPDATE`/`DELETE` (mesmo espírito do caixa append-only, ADR-0010). UNIQUE `(dedupe_key,
  attempt, status)`. `INSERT ... ON CONFLICT DO NOTHING` sobre essa unique.
- **`dedupe_key`** = contrato de idempotência entre a query de gatilho e o log:
  - `post_service:<service_id>`
  - `birthday:<customer_id>:<YYYY>` (ano em UTC)
  - `inactivity:<customer_id>:<YYYY-MM>` (UTC)

  **Deve** embutir um UUID globalmente único (`service_id` / `customer_id`) — um id local
  à org quebraria a UNIQUE global entre tenants. A query de gatilho faz `NOT EXISTS`
  anti-join por **qualquer** linha com o `dedupe_key` (não só a última).
- **CHECK `campaign_sends_sent_at_check`**: `(status='sent' AND sent_at IS NOT NULL) OR
  (status='bounced') OR (status='failed' AND sent_at IS NULL)`.
- **Retry**: `findRetriable` re-tenta só quando a **última** tentativa do `dedupe_key` é
  `failed`, não há nenhuma linha `sent`/`bounced` para o mesmo `dedupe_key`, e `attempt <
  3` (`MAX_ATTEMPTS`) — inserindo linha nova `attempt + 1`. Índice parcial
  `campaign_sends_retriable_idx (dedupe_key) WHERE status = 'failed'`.
- **`bounced`** = linha adicional pós-`sent` (webhook de bounce do Resend, fora do MVP —
  o enum e o CHECK já suportam, nada escreve `bounced` hoje).
- **`org_id` é `NOT NULL`** aqui (ao contrário de `billing_refund_events.org_id`): a
  origem de cada linha é a nossa própria query de gatilho, que parte de
  `customers`/`services` com `org_id` garantido.
- **Sem FK para `organizations`/`customers`** — decisão: é log histórico de comunicação.
  `ON DELETE CASCADE` destruiria a prova do envio (a razão da tabela existir);
  `RESTRICT`/`NO ACTION` bloquearia o direito de eliminação (LGPD). Orfanar
  `customer_id`/`org_id` ao apagar o cliente = pseudonimização (UUID pendurado, sem valor
  identificante), que é o comportamento desejado.
- Como **não há FK nem RLS** (RLS `ENABLE` sem nenhuma policy + `REVOKE ALL FROM anon,
  authenticated`; só `DRIZZLE_ADMIN` lê/escreve), a integridade de `(org_id, customer_id)`
  é responsabilidade da **query de gatilho**: ambos projetados da **mesma linha** de
  `customers`/`services` (`c.org_id` / `c.id`), nunca de contexto de request nem de fontes
  separadas.

### 6. D8 — fuso do gatilho: dia-calendário em `America/Sao_Paulo`

A data de referência dos gatilhos de aniversário/inatividade é o **dia-calendário em
`America/Sao_Paulo`**. `RunCampaignTriggersUseCase` (que não roda SQL) calcula via
`Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })` → `Date` à meia-noite
UTC; os query helpers consomem esse `Date` como texto `YYYY-MM-DD` (`toUtcDateString`) e
montam mês/dia/ano como `int` puro em SQL, sem `::date` sobre `timestamptz` (que
dependeria do `TimeZone` da sessão do banco). As janelas de `post_service` são tempo
absoluto e não dependem de fuso.

É a **primeira decisão de fuso explícita em lógica de negócio do repo** (antes, só o
gerador de PDF de anamnese usava `America/Sao_Paulo`, e para formatação). Aniversário
29/02 não dispara em ano não-bissexto — limitação aceita no MVP.

### 7. Arquitetura do disparo (`RunCampaignTriggersUseCase`)

Gates, **nesta ordem**, antes de qualquer escrita:

1. flag `CAMPAIGNS_ENABLED === "true"` — senão no-op, sem reivindicar o tick;
2. canal de e-mail (`NOTIFICATIONS_EMAIL_ENABLED === "true"` **e** `RESEND_API_KEY` não
   vazio — espelha o cálculo do `ResendEmailSender`) — senão no-op, sem reivindicar o
   tick. (Com o canal off o sender é no-op silencioso, então gravar `sent` queimaria o
   `dedupe_key` sem entregar nada.)
3. `claimRun(JOB_NAME, now, MIN_INTERVAL_MS)` — self-throttle de **20h**
   (`cron_job_state`, molde ADR-0024). Zero escrita em `campaign_sends` se 1 ou 2
   falharem.

- **O passe de retry roda ANTES do loop principal**, de propósito: processa as linhas
  `failed` do run **anterior** (que têm ~20h de espaçamento natural pela janela do
  throttle); rodá-lo depois re-tentaria as falhas recém-criadas no mesmo tick, sem
  backoff. `findRetriable` já traz destinatário/nomes/overrides por JOIN — o reenvio não
  volta ao banco.
- **Por alvo**: `try/catch` individual (best-effort, ADR-0012) — um e-mail ruim não
  derruba o lote. Flag `delivered`: e-mail entregue cujo `INSERT` de `sent` falha é só
  logado, **nunca** marcado `failed` (evitaria duplicata no reenvio); consequência
  aceita = o dedupe re-seleciona o alvo no próximo run. O `record` do caminho de falha
  roda em `try/catch` próprio (`recordFailureSafe`) — não aborta o lote depois de o
  `claimRun` já ter consumido a janela.
- **`error` gravado passa por `redactEmail`** — não persistir PII de e-mail numa tabela
  sem RLS.
- Tetos: **`MAX_TARGETS_PER_TRIGGER = 200`** global cross-org por gatilho por tick
  (`logger.warn` ao atingir — as queries atadas à data não reprocessam o excedente); e
  **`MAX_RETRIES_PER_RUN = 100`** no passe de retry.

### 8. Query helpers de alvo (`drizzle-campaign-target.repository.ts`, `@Inject(DRIZZLE_ADMIN)`)

Cross-org, sem contexto de request. Todo helper aplica, em SQL:

- `INNER JOIN org_campaign_settings` com `<trigger>_enabled = true` (nunca `LEFT` — org
  sem linha = desligada);
- `customers.enabled = true` e `btrim(c.email) <> ''` (whitespace legado do backfill
  0024);
- `INNER JOIN organizations o ON ... AND o.suspended_at IS NULL` (org suspensa pelo
  super_admin não dispara);
- `LEFT JOIN customer_email_preferences p` + predicado de opt-out
  `(p.id IS NULL OR (p.unsubscribed_all_at IS NULL AND p.<trigger>_enabled = true))`;
- `NOT EXISTS` anti-join por `dedupe_key` (qualquer linha);
- `LIMIT`.

`post_service`: janela **rolante** `[now-48h, now-24h)` sobre `services.performed_at`
(`canceled_at IS NULL`), uma linha por serviço. `birthday`: `EXTRACT(MONTH/DAY FROM
birth_date)` como `int`. `inactivity`: `INNER JOIN services` + `GROUP BY` +
`HAVING MAX(performed_at) < referenceDate - (ocs.inactivity_months || ' months')::interval`
— cliente com zero serviços não entra; janela vem da linha de settings da própria org.

**O mesmo predicado de opt-out está no `findRetriable`** — um cliente que se descadastra
**entre** a 1ª tentativa e o retry é respeitado (LGPD). O `<trigger>_enabled` da **org**
(config, não consentimento) **não** é re-checado no retry: a linha já passou pelos gates
na tentativa original.

### 9. Endpoint público de preferências/descadastro

`PublicCampaignsController` (`@Controller("public/campaigns")`, **sem `AuthGuard`** — a
autenticação é o token opaco na URL, `DRIZZLE_ADMIN` via repo):

- `GET /public/campaigns/preferences/:token` — `@Throttle 30/60s`. Devolve payload
  minimizado (`orgName` + 4 toggles, **sem `orgId`**). Token inexistente →
  `CAMPAIGN_PREFERENCES_NOT_FOUND` → **404** (mensagem genérica, sem enumeração).
- `POST /public/campaigns/unsubscribe/:token` — `@Throttle 10/600s`, `@HttpCode(200)`.
  Idempotente (`COALESCE` no timestamp global; `unsubscribeTrigger` sempre devolve
  sucesso se o token existe). Body: `{ trigger? }` — sem `trigger` = opt-out global.
- Throttle assimétrico deliberado (leitura folgada, escrita apertada).
- `CAMPAIGN_PREFERENCES_NOT_FOUND` adicionado ao `DOMAIN_CODE_TO_STATUS`
  (`common/exceptions/domain-status.map.ts`).

O link nos e-mails aponta para o **frontend** `${FRONTEND_URL}/preferencias-email/:token`
(tela do Bloco B), que consome este endpoint.

## Consequências

### O que passa a ser possível

- Três campanhas de relacionamento por e-mail disparadas por evento, cross-org, atrás de
  um kill-switch global + liga/desliga por gatilho por org.
- Copy autoral do produto com override opcional por org (assunto e corpo, por gatilho,
  fallback por campo), seguro contra injeção (texto puro + allowlist de tokens +
  sanitização de header no assunto).
- Descadastro por gatilho ou global via link estável em toda mensagem, com o timestamp de
  retirada de consentimento preservado.

### Débito conhecido (registrado, sem migração)

- **Round-trip de envio ao vivo (Resend) não exercitado** — sem `RESEND_API_KEY` o
  `send()` é no-op. Cobertura = unit tests (escape anti-injeção, gates, best-effort,
  retry, opt-out por leitura do SQL).
- **Predicados de opt-out (LGPD) vivem em SQL cru nos repos, sem teste de integração**
  (não há harness de DB nos specs) — validados por leitura + `database-guardian`.
  Recomendação: teste de integração contra Supabase local cobrindo cliente sem linha /
  opt-out global / opt-out por gatilho / opt-out entre 1ª tentativa e retry.
- **`MAX_TARGETS_PER_TRIGGER = 200` global cross-org por gatilho por tick**: as queries
  são atadas à data, então ao atingir o teto o excedente **sai da janela e não é
  reprocessado** — possível perda de envio, sinalizada só por `logger.warn`. Planejar
  por-org ou fila quando a base crescer.
- **`bounced` não é escrito** — falta o webhook de bounce do Resend. Enum e CHECK já
  suportam.
- **Sem índice dedicado a `campaign_sends.customer_id`** — há `(org_id, created_at DESC)`
  e o parcial de retriable; adicionar quando existir query por cliente.
- **Sem subdomínio de envio dedicado** (`campanhas.*`) — item de ops; `ResendEmailSender`
  fixa `NOTIFICATIONS_FROM_EMAIL` no construtor.
- **Retry no mesmo dia degrada a escada de 3 tentativas para ~2** se o passe de retry
  rodar 2x num dia — mitigado por rodar antes do loop principal e pela janela de 20h.

### Pré-requisito de ativação

**Bloco B** (2 telas — config de campanha do dono + página de preferências do cliente em
`/preferencias-email/:token`) **deve** existir antes de `CAMPAIGNS_ENABLED=true`: o link
de descadastro precisa de destino vivo (LGPD). `CAMPAIGNS_ENABLED` e todos os `*_enabled`
por org nascem `false`.

## Alternativas rejeitadas

- **Reusar `NotificationService`/`modules/notifications`** — keyed em `users.id`;
  campanhas alvejam `customers` sem conta. Rejeitado por distorcer o contrato.
- **Puxar o módulo de Feature Flags (ADR-0009) agora** — rejeitado por escopo; gate por
  env resolve o MVP, a migração fica para quando o módulo existir.
- **FK em `campaign_sends` para `organizations`/`customers`** — `CASCADE` destrói a prova
  do envio, `RESTRICT` bloqueia a eliminação por LGPD. Escolhida a pseudonimização
  (órfão sem FK).
- **`dangerouslySetInnerHTML` / template engine para a copy custom** — rejeitado; texto
  puro em `<Text>` + allowlist de 2 tokens em passe único elimina toda a superfície de
  injeção sem dependência nova.
- **Estado `pending` em `campaign_sends`** — rejeitado; a linha só é inserida **depois**
  do sender responder, então só há status terminal (append-only puro, sem update de
  transição).

## Relacionado

- **ADR-0012** (e-mail transacional, React Email, módulo `mail`, gating por env,
  best-effort vs. crítico) — base direta; `footerOverride` é a única mudança no
  `base-layout` compartilhado, aditiva.
- **ADR-0018** (LGPD Tier 1) — o Tier 2 listava "opt-out em e-mail de notificação".
  Campanhas nascem com opt-out completo; **`NotificationService`/`MailService.sendNotification`
  continuam sem opt-out** — o débito do Tier 2 permanece aberto para as notificações,
  este ADR cobre só campanhas.
- **ADR-0009** (Feature Flags) — deliberadamente **não** adotado aqui; gate por env
  (`CAMPAIGNS_ENABLED`) + flags por gatilho por org em tabela própria.
- **ADR-0010** (caixa append-only) — modelo de referência para `campaign_sends` (uma
  linha terminal por tentativa, nunca `UPDATE`/`DELETE`).
- **ADR-0005** (multi-tenant single DB + RLS) — `campaign_sends` e os query helpers
  cross-org usam `DRIZZLE_ADMIN` por rodarem sem contexto de request; exceção já coberta
  pela regra geral de `domain-rules.md` (cron/cross-org), não a exceção de
  "autorização por coluna" do ADR-0021.
- **ADR-0024** — `cron_job_state.claimRun` (self-throttle) reusado com o mesmo molde.
- `.memory/domain-rules.md` → "Campanhas de e-mail por gatilho".
- Migrations `apps/backend/drizzle/migrations/0061_customer_email_preferences.sql`,
  `0062_org_campaign_settings.sql`, `0063_campaign_sends.sql` (os cabeçalhos são fonte
  primária).
