# Gotchas técnicos

Comentários explicativos foram removidos do código-fonte (limpeza de 2026-07-17) para manter
a regra do projeto de não ter prosa no meio do código. Este arquivo reúne o que era um
"porquê" não-óbvio e **não** já está coberto em `.memory/domain-rules.md` (regras de negócio,
RLS/tenancy, ADRs) — consulte lá primeiro para contexto de produto/arquitetura.

## Backend

### Drizzle / Postgres

- **Migrator: identidade de "aplicada" é `created_at`, não o hash do arquivo**
  (`apps/backend/src/database/migrator.ts`). A comparação de hash é só diagnóstica — o migrator
  custom (ADR-0003) considera uma migration aplicada pelo `created_at`/`when` no journal, nunca
  pelo hash do conteúdo. Isso é necessário porque migrations escritas à mão são reformatadas
  (prettier/edição manual) depois do primeiro `db:migrate` local, o que mudaria o hash sem que a
  DDL precise re-rodar. Ver também: `drizzle-kit generate` está quebrado desde a migration 0011
  (sem snapshots) — todas as migrations posteriores são escritas à mão.

- **`database.module.ts`**: o proxy `DRIZZLE` fora de qualquer contexto de request (sem
  `AsyncLocalStorage` ativo) usa uma conexão sem claims — isso é intencional (fail-closed: RLS
  nega tudo por padrão nesse caminho, em vez de vazar dados). `requestMemo` deduplica lookups
  repetidos (ex.: `findByAuthId` chamado ~3x no carregamento do overview) dentro do escopo de uma
  única request.

### E-mail / telemetria

- **`all-exceptions.filter.ts`**: só erros 5xx / não mapeados / inesperados são reportados ao
  Better Stack — 4xx de negócio (`DomainException`) são logados localmente em debug e nunca vão
  para o telemetry, para manter o stream de erros sinalizando só o que é realmente anômalo.

- **`telemetry.service.ts`** e **`_error.tsx`** (frontend): sem token configurado, o client é
  no-op (mesmo padrão de `MailService`/`AuditService` — funciona sem credenciais em dev). No
  `_error.tsx` do lado servidor, o Better Stack (`@logtail`) batelas envios — é preciso `await
  log.flush()` antes de responder, senão o log pode ser perdido em ambientes serverless/edge.

### Cashier

- **`drizzle-transaction.repository.ts`**: `transactions` não referencia `customer` diretamente;
  o vínculo é via `services` (`services.customer_id` → `services.payment_transaction_id` →
  `transactions.id`). O `orgId` usado nesse join sempre vem da query externa (sessão) — nunca
  aceitar de outra fonte.
- O saldo por período (`get-balance` histórico) calcula um running sum sobre **todo** o
  histórico antes de recortar o intervalo `[from, to]` — necessário para que cada ponto reflita
  o saldo acumulado real, não apenas a soma do intervalo.
- **`fee-calculator.ts`** (backend) e **`features/cashier/lib/fees.ts`** (frontend) implementam o
  mesmo cálculo de taxa em duplicidade (preview client-side vs. valor autoritativo no backend).
  Mudar a fórmula em um lugar sem espelhar no outro causa divergência silenciosa entre o preview
  e o valor real gravado.

## Frontend

### Next.js (pages router)

- **`router.query` só fica populado após a hidratação** — código que lê `query.token` (ex.:
  `pages/anamnesis/[token].tsx`, formulário de login com convite) no primeiro render vê valores
  vazios. Sempre reagir a mudanças via efeito, nunca assumir o valor pronto na primeira
  renderização.
- **`infrastructure/api/client.ts`**: para requests com `FormData`, o `Content-Type` não deve ser
  setado manualmente — o browser precisa defini-lo (com o `boundary` do multipart). Setá-lo à
  mão quebra o parse no servidor.

### React Query

- **`infrastructure/query/query-keys.ts`**: a chave da consulta pública de anamnese
  (`["anamnesis", "public", token, ...]`) usa a string `"public"` no lugar onde normalmente iria
  o `orgId`, de propósito — evita colidir com o prefixo `["anamnesis", orgId, ...]` usado para
  invalidação por organização.
- **`features/notifications/hooks/use-notifications.ts`**: polling de 60s só com a aba em foco
  (`refetchIntervalInBackground: false`) + `refetchOnWindowFocus: true` para atualizar assim que
  o usuário volta — evita polling em background desnecessário.
- **`queryFn` NUNCA pode resolver `undefined`** — o React Query v5 rejeita a promise com
  "Query data cannot be undefined" e coloca a query em estado de erro. Quando o endpoint pode não
  ter recurso ("ficha ainda não criada"), normalize com `?? null` **dentro da `queryFn`**, como em
  `features/anamnesis/hooks/use-anamnesis-form.ts`. Isso é sutil porque o erro não parece vir da
  lib: aparece como falha de carregamento genérica na UI. `mutationFn` **aceita** `undefined` sem
  problema, então só as queries precisam disso.

### Cliente HTTP (`infrastructure/api/client.ts`)

- **Corpo vazio em 2xx não é só 204** (corrigido em 2026-07-30, N-A do backlog de 29/07). O
  NestJS responde **200 com corpo vazio** — não 204 — quando o handler retorna `null` ou `void`
  sem `@HttpCode(HttpStatus.NO_CONTENT)`. Por isso o `apiRequest` lê `res.text()` e só chama
  `JSON.parse` se houver conteúdo, em vez de checar apenas `status === 204`. Antes disso,
  `res.json()` lançava `SyntaxError: Unexpected end of JSON input` e **um handler `void` do
  backend virava um bug de frontend aparentemente sem relação** — três bugs reportados como
  independentes na reunião de 29/07 (anamnese não carrega com HTTP 200, botão de criar pergunta
  "ausente", presença em evento coletivo falhando) tinham essa única causa. Pior: em mutation, a
  escrita **funcionava** no servidor e só a invalidação de cache não rodava, o que parecia
  inconsistência de dados. Endpoints que hoje respondem 2xx com corpo vazio:
  `GET /orgs/:orgId/service-types/:serviceTypeId/anamnesis-form` (retorna `null` quando não há
  ficha) e `PUT /orgs/:orgId/calendar/events/:id/rsvp` (`Promise<void>`). A spec
  `client.spec.ts` trava a regressão — mantenha-a ao mexer no cliente.

### React Hook Form

- **`useFieldArray` com `keyName` customizado** (`anamnesis-form-builder.tsx`): o default do RHF
  (`"id"`) sobrescreveria o `id` real (UUID) de cada pergunta no array com um valor gerado pelo
  RHF que não é UUID — isso vazaria no payload do POST e o backend rejeitaria (`@IsUUID`). Usar
  sempre um `keyName` diferente de `"id"` quando o item do array já tem seu próprio `id` de
  domínio.
- **Erros de `superRefine` em nível de array** aninham sob `errors.<field>.root.message`, não
  sob o índice do item (`service-form.tsx`, bug catalogado em sessão anterior — ver
  `bug_m2_material_acabou_toggle`). Ao ler erros de validação de um array inteiro, checar
  `.root` além do erro por item.

### Radix UI (portais)

- **`service-form.tsx`**: ao trocar o valor de um `Select` que dispara a abertura de um `Dialog`
  (ou vice-versa), é necessário `defer` (ex.: `setTimeout(0)` ou microtask) a segunda ação —
  senão os dois portais do Radix competem pelo foco e um deles não abre/fecha corretamente.
  Mesmo padrão necessário depois de inserir uma opção nova num `Select` controlado: o valor só é
  aceito se a opção já estiver no DOM quando o `value` mudar.
- **`shared/components/ui/calendar.tsx`**: `caption_label` é escondido via className de
  propósito — o componente sempre usa `captionLayout="dropdown"` (mês/ano via `Select`
  Radix, não o `<select>` nativo do react-day-picker, que abre um popup do SO não
  tematizável).

### CSS

- **`features/dashboard/components/top-header.tsx`**: o header precisa de `relative z-10` para
  elevar seu stacking context acima da sidebar (senão o dropdown do `OrgSwitcher` renderiza
  atrás dela). `backdrop-filter`/`backdrop-blur` cria um stacking context próprio — sem um
  `z-index` explícito nesse elemento, ele perde para irmãos com z-index maior mesmo estando
  depois no DOM.
