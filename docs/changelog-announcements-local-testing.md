# Anúncio de novidades por e-mail (changelog) — teste local

Guia operacional pra testar a seleção de alvos do anúncio de changelog por e-mail
(Bloco 5.2 fatia C; versionamento em
[`.memory/adr/0031-versionamento-semver-unificado-do-produto.md`](../.memory/adr/0031-versionamento-semver-unificado-do-produto.md))
contra o Postgres local do Supabase. Mesmo padrão de
[`campaigns-local-testing.md`](./campaigns-local-testing.md).

> **Por que este guia existe:** o predicado de seleção vive em **SQL cru** em
> `modules/changelog/infrastructure/persistence/drizzle-changelog-target.repository.ts`
> (`findOwnersToNotify`). O backend **não tem harness de integração de banco**, então
> esse predicado **não tem cobertura automatizada**. A **sonda SQL** da seção 3 **é** a
> verificação e **deve ser re-rodada sempre que o predicado mudar**.

## 1. Pré-requisitos e ambiente

- Stack local do Supabase no ar (`pnpm db:start`) e migrations aplicadas
  (`pnpm --filter backend db:migrate`, incluindo `0082` e `0083`).
- Acesso SQL ao banco local (`psql` no container `supabase_db_aso` ou Studio local).

| Var | Valor p/ testar | Observação |
|---|---|---|
| `CHANGELOG_ANNOUNCEMENTS_ENABLED` | `true` | Kill-switch do job de anúncio. Ausente/`!= "true"` → no-op |
| `NOTIFICATIONS_EMAIL_ENABLED` | `true` | Metade do gate do canal de e-mail |
| `RESEND_API_KEY` | chave de teste do Resend | Vazia → canal desligado, nada é enviado |
| `APP_ENVIRONMENT` | `development` (ou ausente) | Só `production` desliga a allowlist (ADR-0028) |
| `EMAIL_ALLOWLIST` | o seu e-mail | Fora de produção, vazia bloqueia TODO envio (fail-safe) |
| `CRON_SECRET` | qualquer string | Header `x-cron-secret` do tick |

Reinicie o backend após mexer no `.env`. Sem chave Resend real só a sonda SQL (seção 3) é
verificável; ela não depende de e-mail.

## 2. Modelo de dados relevante

- `users.product_updates_opted_out_at` (migration `0082`): não-nulo = descadastrado (LGPD).
- `changelog_notifications` (migration `0083`): log append-only, `UNIQUE (user_id, entry_id)`.
  `status = 'sent'` ⇒ `sent_at` NOT NULL e `error` NULL; `'failed'` ⇒ `sent_at` NULL.
  Sem FK em `user_id` (log histórico; LGPD) — por isso `error` guarda só **classe/código
  redigido** (`redactDeliveryError`), nunca payload do provedor.
- Alvo = **dono** (`org_memberships.role = 'owner'`) de org **não suspensa**.
  `super_admin` **não** é sintetizado como owner (ADR-0013 vale para autorização, não
  para targeting de e-mail). `org_memberships.user_id` referencia `users.id`.

## 3. Sonda SQL do predicado (`findOwnersToNotify`)

Tradução literal do SQL do repositório. Ajuste `:entry_id` e `:published_at`
(data pura, ex.: `'0.5.0'` e `'2026-09-01'`) e rode:

```sql
SELECT t.user_id, t.name, t.email
FROM (
  SELECT DISTINCT ON (u.id)
    u.id AS user_id, u.name AS name, u.email AS email, u.created_at AS created_at
  FROM users u
  INNER JOIN org_memberships om
    ON om.user_id = u.id AND om.role = 'owner' AND om.enabled = true
  INNER JOIN organizations o ON o.id = om.org_id AND o.suspended_at IS NULL
  WHERE btrim(u.email) <> ''
    AND u.product_updates_opted_out_at IS NULL
    AND u.created_at < (('2026-09-01'::date + 1)::timestamp AT TIME ZONE 'UTC')
    AND NOT EXISTS (
      SELECT 1 FROM changelog_notifications cn
      WHERE cn.user_id = u.id AND cn.entry_id = '0.5.0'
    )
  ORDER BY u.id
) t
ORDER BY t.created_at ASC, t.user_id ASC
LIMIT 100;
```

### Cenários semeados

Use `publishedAt = '2026-09-01'` (elegível: criado até o FIM desse dia, em UTC) e
`entry_id = '0.5.0'`. Tudo abaixo é dado de
teste no banco **local**; limpe ao final (seção 4). Os `INSERT` em `users` assumem que os
demais campos NOT NULL da tabela têm default ou são preenchidos por você (`auth_id` único);
ajuste conforme o schema atual.

```sql
-- Orgs de apoio
INSERT INTO organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'T Normal',   't-normal'),
  ('00000000-0000-0000-0000-0000000000a2', 'T Suspensa', 't-suspensa'),
  ('00000000-0000-0000-0000-0000000000a3', 'T Multi 1',  't-multi-1'),
  ('00000000-0000-0000-0000-0000000000a4', 'T Multi 2',  't-multi-2'),
  ('00000000-0000-0000-0000-0000000000a5', 'T Multi 3',  't-multi-3');
UPDATE organizations SET suspended_at = now()
  WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- Usuários (auth_id aleatório; created_at explícito)
INSERT INTO users (id, auth_id, name, email, created_at, product_updates_opted_out_at) VALUES
  ('00000000-0000-0000-0000-0000000000b1', gen_random_uuid(), 'Normal',   'normal@t.test',   '2026-08-01', NULL),
  ('00000000-0000-0000-0000-0000000000b2', gen_random_uuid(), 'Suspensa', 'susp@t.test',     '2026-08-01', NULL),
  ('00000000-0000-0000-0000-0000000000b3', gen_random_uuid(), 'OptOut',   'optout@t.test',   '2026-08-01', now()),
  ('00000000-0000-0000-0000-0000000000b4', gen_random_uuid(), 'Novo',     'novo@t.test',     '2026-10-01', NULL),
  ('00000000-0000-0000-0000-0000000000b5', gen_random_uuid(), 'Multi',    'multi@t.test',    '2026-08-01', NULL),
  ('00000000-0000-0000-0000-0000000000b6', gen_random_uuid(), 'Ja',       'ja@t.test',       '2026-08-01', NULL),
  ('00000000-0000-0000-0000-0000000000b7', gen_random_uuid(), 'Desab',    'desab@t.test',    '2026-08-01', NULL),
  ('00000000-0000-0000-0000-0000000000b8', gen_random_uuid(), 'MesmoDia', 'mesmodia@t.test', '2026-09-01T15:00:00Z', NULL),
  ('00000000-0000-0000-0000-0000000000b9', gen_random_uuid(), 'DiaSeg',   'diaseg@t.test',   '2026-09-02T00:00:00Z', NULL);

-- Todos donos de 'T Normal' (a1), exceto os cenários específicos
INSERT INTO org_memberships (org_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b2', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b3', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4', 'owner'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b5', 'owner'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000b5', 'owner'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b5', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b6', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b7', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b8', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b9', 'owner');
UPDATE org_memberships SET enabled = false
  WHERE user_id = '00000000-0000-0000-0000-0000000000b7';

-- Já notificado (CHECK: 'sent' => sent_at NOT NULL, error NULL)
INSERT INTO changelog_notifications (user_id, entry_id, status, sent_at)
VALUES ('00000000-0000-0000-0000-0000000000b6', '0.5.0', 'sent', now());
```

Resultado esperado da sonda:

| Usuário | Aparece? | Por quê |
|---|---|---|
| `Normal` (b1) | **sim** | dono de org ativa, sem opt-out, criado antes do dia do `publishedAt` |
| `MesmoDia` (b8) | **sim** | cadastrado no próprio dia da publicação (2026-09-01) |
| `DiaSeg` (b9) | não | cadastrado no dia seguinte (>= 2026-09-02T00:00Z) |
| `Suspensa` (b2) | não | única org dele está suspensa (`o.suspended_at IS NULL`) |
| `OptOut` (b3) | não | `product_updates_opted_out_at` preenchido |
| `Novo` (b4) | não | `created_at` posterior ao fim do dia do `publishedAt` |
| `Multi` (b5) | **sim, 1 linha** | dono de 3 orgs; `DISTINCT ON (u.id)` colapsa |
| `Ja` (b6) | não | já existe linha em `changelog_notifications` para o `entry_id` |
| `Desab` (b7) | não | dono com `org_memberships.enabled = false` |

Verificações adicionais rápidas:

- Trocar a `role` de b1 para `'employee'` → some (só `owner`).
- `UPDATE users SET email = '  ' ...` em b1 → some (`btrim(u.email) <> ''`).
- Rodar com outro `entry_id` (ex.: `'0.6.0'`) → b6 volta a aparecer (o anti-join é por entrada).

### Janela de recência (política do use-case)

Fora do SQL: o use-case só processa itens com `publishedAt` nos últimos
**30 dias** (`ANNOUNCEMENT_RECENCY_DAYS`, borda de 30 dias inclusiva) em relação ao
"agora" do tick; itens mais antigos são ignorados sem log. Consequência: quem passa a
ser elegível depois (dono promovido, opt-out revertido, org que sai de suspensão)
recebe **no máximo os releases dos últimos 30 dias**, nunca o histórico inteiro. Coberto
por spec do use-case (não pela sonda SQL).

## 4. Reset entre execuções

```sql
DELETE FROM changelog_notifications WHERE user_id::text LIKE '00000000-0000-0000-0000-0000000000b%';
DELETE FROM org_memberships WHERE org_id::text LIKE '00000000-0000-0000-0000-0000000000a%';
DELETE FROM users WHERE id::text LIKE '00000000-0000-0000-0000-0000000000b%';
DELETE FROM organizations WHERE id::text LIKE '00000000-0000-0000-0000-0000000000a%';
```

## 5. Gotchas

- **`user_id` gravado no log DEVE ser o `u.id` da linha selecionada** (não `auth_id`).
- **`error` nunca guarda payload do provedor**: o repositório aplica `redactDeliveryError`
  (e-mails → `[email redigido]`, corte em 200, fallback `unknown_error`) mesmo que o
  caller já redija.
- O predicado exige `org_memberships.enabled = true` (membro desabilitado não recebe;
  precedente: `findOwnerUserIds` do estoque).
- Se `drizzle-changelog-target.repository.ts` mudar, re-rode a sonda e atualize este guia.
