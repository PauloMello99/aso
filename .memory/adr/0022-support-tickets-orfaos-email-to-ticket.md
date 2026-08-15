# ADR-0022 — Tickets órfãos (formulário público) + e-mail-to-ticket via Resend Inbound

**Data**: 2026-08-15
**Status**: Aceito

## Contexto

A Fatia A do módulo `support` (ADR-0021) entregou o portal autenticado + fila admin, mas
adiou de propósito duas superfícies sem sessão: um formulário público/anônimo de suporte
(visitante que ainda não é cliente da plataforma, ou cliente que não consegue logar) e
e-mail-to-ticket (responder pelo próprio cliente de e-mail, sem abrir o portal). As duas
têm o mesmo problema de fundo: **o ticket nasce sem organização conhecida** — o
formulário público não tem contexto de sessão/org, e um e-mail recebido só carrega
`from`/`to`, não `org_id`. O `docs/spikes/support-inbound-email.md` (2026-08-10) confirmou
a viabilidade técnica do segundo: a Resend lançou "Inbound" (nov/2025), disponível em
todos os planos (inclusive Free), zero provedor novo além do já usado para envio
(ADR-0012) — webhook `email.received` traz só metadados, um fetch adicional
(`resend.emails.receiving.get()`) traz corpo/anexos, e a assinatura é verificada via Svix
(mesmo padrão de Stripe/Clerk). Essa investigação liberou a Fatia C para entrar em
implementação.

## Decisão — RLS de ticket órfão (`org_id` nullable)

`tickets.org_id`/`ticket_responses.org_id`/`ticket_attachments.org_id` passam a aceitar
`NULL` (migration `0044_tickets_nullable_org.sql`). Um ticket órfão é visível **apenas**
para `super_admin` (fila de triagem) até ser vinculado manualmente a uma organização.

Todas as policies de SELECT/UPDATE ramificam **explicitamente** entre os dois casos, em
vez de deixar o `NULL` cair implicitamente na semântica de três valores do Postgres
(`org_id = <algo>` avaliando para `NULL`/`false`):

```sql
-- tickets_select / ticket_attachments_select (mesma forma)
(org_id IS NULL AND public.is_super_admin())
OR (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id)))

-- ticket_responses_select (com o guard de nota interna preservado)
(org_id IS NULL AND public.is_super_admin())
OR (org_id IS NOT NULL AND (public.is_super_admin() OR (public.is_org_member(org_id) AND is_internal_note = false)))

-- tickets_update — USING igual ao SELECT, WITH CHECK bloqueia orfanização/"desvinculação" via RLS comum
USING ((org_id IS NULL AND public.is_super_admin()) OR (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id))))
WITH CHECK (org_id IS NOT NULL AND (public.is_super_admin() OR public.is_org_member(org_id)))
```

As policies de INSERT das 3 tabelas exigem `org_id IS NOT NULL AND (...)` — **sem** o
ramo `org_id IS NULL` que SELECT/UPDATE têm. Isso significa que **nenhum caminho via RLS
comum (`app_user`) pode criar linha órfã**; só `DRIZZLE_ADMIN`/`service_role` (que
bypassa RLS) cria ticket/resposta/anexo sem organização — exatamente os dois pontos de
entrada sem sessão (create-public-ticket, handle-inbound-email). A forma explícita
(em vez de deixar o comportamento correto depender de quem lê saber de cor a 3VL do
Postgres) é um trade-off deliberado de verbosidade por auditabilidade, justificado porque
este é **o módulo de maior risco de tenancy do projeto** (dado sem organização, por
definição, é o caso onde um vazamento cross-tenant é mais fácil de passar despercebido).

Isso é uma **extensão direta** da exceção já registrada no ADR-0021: autorização por
coluna (aqui, "quem pode setar/ver `org_id = NULL`") continua vivendo na camada de
aplicação (`DRIZZLE_ADMIN` escopado + use-case decidindo o que grava), não em RLS/trigger
— RLS aqui só modela a autorização por **linha** que já é modelável (visibilidade de
`super_admin` vs. tenant), reforçando o mesmo princípio: múltiplas classes de ator
(tenant, super_admin, sistema/webhook) escrevendo a mesma tabela pelo mesmo pool de
conexão é o sinal de alerta, e a resposta é sempre "escopar `DRIZZLE_ADMIN` explicitamente
+ deixar o código decidir campos", nunca tentar ensinar o Postgres a diferenciar atores
dentro da mesma policy.

## Decisão — resolução de organização é SEMPRE manual

Descartamos deliberadamente resolver a organização automaticamente por heurística
(slug no assunto, e-mail de membro conhecido, domínio do remetente etc.) — qualquer
heurística é **falsificável** (um atacante ou só um remetente coincidente pode forjar o
vínculo a uma org que não é a dele) e o custo de errar é alto (dado de suporte vazando
para a organização errada). O vínculo só acontece por **ação explícita de `super_admin`**
na fila admin: `LinkTicketToOrganizationUseCase` (`link-ticket-to-organization.use-case.ts`)
lê o ticket via `findByIdAsAdmin`, confirma `orgId === null` (checagem otimista — evita
mascarar uma corrida só pelo `AND org_id IS NULL` do repositório), confirma que a org de
destino existe, e propaga `org_id` para ticket + respostas + anexos numa **única
transação** com **assert pós-update** (segunda camada de proteção contra a mesma corrida,
caso duas requisições cheguem entre a checagem otimista e o `UPDATE`) — `ITicketRepository
.linkToOrganization` lança se a linha já não estiver mais órfã no momento do update.

## Decisão — idempotência e threading do e-mail

**Idempotência**: tabela `support_inbound_emails` (migration `0045`) com RLS
**habilitada mas sem nenhuma policy** — deny-by-default deliberado para qualquer role
comum (`app_user`/`authenticated`/`anon`); só `DRIZZLE_ADMIN`/`service_role` (bypassa RLS)
lê/escreve, mais `REVOKE ALL ... FROM anon, authenticated` como defesa em profundidade
contra a Data API do Supabase (mesmo padrão da migration `0041` para as tabelas de
ticket). `email_id UNIQUE` é a chave de dedupe: o handler tenta "reivindicar" o evento via
`INSERT ... ON CONFLICT (email_id) DO NOTHING` — zero linhas afetadas = evento já
processado (a Resend pode reenviar o mesmo `email.received` em retry), ignora.

O **claim** (reivindicação da linha de dedupe) e a **escrita de negócio** (criar/atualizar
ticket, resposta, anexos) acontecem na **MESMA transação**
(`ITransactionRunner.run` em `HandleInboundEmailUseCase`). Isso corrigiu um bug real
encontrado durante a implementação: a versão anterior tinha um `try/catch` **por anexo**,
dentro da transação, para não deixar a falha de download/upload de um único anexo abortar
o ticket inteiro — mas quando a falha era uma falha real de **banco** (não de storage),
capturar o erro *dentro* da transação deixava o Postgres em estado abortado
(`current transaction is aborted, commands ignored until end of transaction block`), e
como o claim de idempotência também estava dentro da mesma transação abortada, o
`ON CONFLICT DO NOTHING` nunca commitava — o mesmo e-mail voltava a cair como "não
processado" no próximo retry da Resend, entrando em **loop infinito**. A correção separa
as duas fases: validação/preparação de anexo (baixar da Resend, checar
tamanho/mimetype, decidir se descarta) acontece **antes** de abrir a transação, sem
try/catch por item; a persistência (INSERT do anexo, upload ao Storage) acontece
**dentro** da transação, também sem try/catch por item — uma falha real de infraestrutura
aborta a transação inteira de propósito, e a linha de dedupe nunca é comitada, permitindo
retry legítimo no próximo evento da Resend.

**Threading**: `Reply-To: suporte+{ticketId}@assessorink-so.com` (plus-addressing) é usado nos
e-mails de notificação existentes (`ticket-response-added.tsx`). Quando o `to` do webhook
contém esse plus-address, o handler **sempre confirma** que o `from` do e-mail recebido
bate (case-insensitive) com o `requesterEmail` gravado no ticket antes de tratar o e-mail
como uma resposta a esse ticket — nunca confia no plus-address sozinho (que é público,
visível em qualquer e-mail de notificação recebido, e portanto forjável por quem quer que
tenha visto um). Sem essa confirmação, qualquer pessoa com acesso a um e-mail de
notificação de ticket alheio poderia injetar respostas nesse ticket. Quando o plus-address
não bate ou a confirmação falha, o e-mail vira um ticket **órfão novo** (fallback seguro),
não uma resposta anexada ao ticket errado.

## Decisão — verificação de segurança das 2 superfícies sem sessão

- **Formulário público** (`create-public-ticket`): Cloudflare Turnstile
  (`turnstile-captcha-verifier.ts`) + rate limit (3 submissões / 10 min). **Fail-closed por
  padrão**: se `TURNSTILE_SECRET_KEY` está ausente, o verificador só retorna `true`
  (bypass) quando `TURNSTILE_DEV_BYPASS === "true"` **explicitamente** — nunca inferido de
  `NODE_ENV` (não existe atalho "development"/"staging" = bypass automático; sem a env var
  explícita, mesmo em dev, o verify falha fechado).
- **Webhook de e-mail** (`support-inbound-webhook.controller.ts` +
  `resend-inbound-email.client.ts`): verificação de assinatura Svix via
  `RESEND_WEBHOOK_SECRET` — o client **sempre lança** quando o secret está ausente, em
  **nenhum** ambiente há bypass (diferente do Turnstile, que tem uma válvula de dev
  explícita; aqui não existe válvula nenhuma).
- **`app.set("trust proxy", 1)`** (`main.ts`) — necessário para que o rate limit do
  formulário público e o `remoteIp` repassado ao Turnstile reflitam o IP real do
  visitante, não o IP do proxy/CDN na frente do backend (sem isso, todas as requisições
  apareceriam vindas do mesmo IP interno, quebrando tanto o rate limit quanto a
  verificação do Turnstile, que usa o IP como sinal).

## Nota de deploy

O domínio de e-mail configurado para inbound é o **domínio raiz** (`assessorink-so.com`), não um
subdomínio dedicado — o spike recomendava explicitamente um subdomínio (ex.
`suporte.assessorink-so.com`) para evitar conflito de registro **MX** com o e-mail corporativo
existente no domínio raiz (SPF/DKIM cuidam do envio já usado pelo ADR-0012; MX é um
registro diferente, específico de recebimento). **Validar com quem administra o DNS de
produção antes de publicar** — se já existir MX no domínio raiz para e-mail corporativo,
configurar o MX do Resend Inbound ali pode quebrar o recebimento de e-mail existente. A
troca para subdomínio é só de configuração de ambiente
(`SUPPORT_INBOUND_DOMAIN`) — zero mudança de código.

`app.set("trust proxy", 1)` assume **1 hop** de proxy entre o cliente e o backend
(topologia atual). Se a topologia de deploy ganhar mais camadas de proxy/CDN
(ex. CDN → load balancer → app), revisar esse valor — 1 hop insuficiente faz o Express
continuar lendo o IP do hop mais próximo, não o IP real do visitante.

## Débito técnico aceito (registrado deliberadamente, não bloqueou o fechamento)

a. **Anexo de ticket órfão não migra de path no Storage após o vínculo.** O anexo nasce
   com `storage_path` prefixado por `orphan/{ticketId}/{uuid}-{nome}`
   (`HandleInboundEmailUseCase.persistAttachments`, coalesce de `orgId ?? "orphan"`).
   Quando `LinkTicketToOrganizationUseCase` vincula o ticket a uma org, só a **coluna**
   `org_id` das linhas é atualizada — o objeto físico no Storage continua sob o prefixo
   antigo `orphan/...`. Mover o objeto fica para uma fatia futura (comentário já deixado
   no próprio use-case).
b. **Upload ao Storage do anexo de e-mail acontece dentro da transação de banco**, então
   não participa do rollback do Postgres — uma falha rara entre "upload concluído" e
   "commit da transação de banco" pode deixar um blob órfão no bucket (sem linha
   correspondente no banco). Aceito porque o caso é raro e o custo de um blob órfão é
   baixo (storage, não dado de negócio incorreto).
c. **Anexo de e-mail descartado só é logado no servidor**, não fica visível para o agente
   que atende o ticket na fila admin — se um e-mail chega com um anexo grande demais ou de
   mimetype não permitido, o ticket é criado normalmente mas o agente não tem nenhum sinal
   na UI de que um anexo foi descartado (só nos logs do backend).
d. **Resolução de categoria por `systemKey` duplicada em 3 use-cases**
   (`create-ticket`, `create-public-ticket`, `handle-inbound-email`) em vez de um método
   único de repositório reutilizado pelos três.

## Relacionado

- ADR-0021 (autorização de coluna via `DRIZZLE_ADMIN` escopado — esta ADR estende o mesmo
  princípio para o eixo órfão/vinculado).
- ADR-0005 (multi-tenant single DB + RLS), ADR-0012 (módulo `mail`/Resend).
- `docs/spikes/support-inbound-email.md` (viabilidade técnica, fonte da decisão de usar
  Resend Inbound em vez de Postmark/Mailgun/SendGrid).
- Migrations `apps/backend/drizzle/migrations/0044_tickets_nullable_org.sql` (RLS de
  ticket órfão) e `0045_support_inbound_emails.sql` (dedupe do webhook).
- `.memory/domain-rules.md` (seção Support).
