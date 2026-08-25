---
name: domain-rules
description: Regras de domínio e decisões de modelagem do ink-ops
metadata:
  type: project
---

## Regras de Clean Architecture (backend)

Estas regras derivam do ADR-0006 e são **obrigatórias** em qualquer novo código de backend.

### Onde cada tipo de código vive

| Tipo                         | Camada            | Diretório                                                     |
| ---------------------------- | ----------------- | ------------------------------------------------------------- |
| Entidade de domínio          | Domain            | `<feature>/domain/<entity>.entity.ts`                         |
| Interface de repositório     | Domain            | `<feature>/domain/<entity>.repository.interface.ts`           |
| Exceção de domínio           | Domain            | `<feature>/domain/exceptions/<code>.exception.ts`             |
| Interface de serviço externo | Application/Ports | `<feature>/application/ports/<service>.interface.ts`          |
| Use-case                     | Application       | `<feature>/application/use-cases/<verb>-<entity>.use-case.ts` |
| Implementação de repositório | Infrastructure    | `<feature>/infrastructure/persistence/<entity>.repository.ts` |
| Mapper (Drizzle ↔ domain)    | Infrastructure    | `<feature>/infrastructure/persistence/<entity>.mapper.ts`     |
| Controller                   | Interface         | `<feature>/<feature>.controller.ts`                           |
| DTO + validação              | Interface         | `<feature>/dto/*.dto.ts`                                      |
| Guard / decorator            | Interface         | `<feature>/guards/` ou `<feature>/decorators/`                |

### Regras obrigatórias

1. **Use-cases NÃO importam `DRIZZLE` diretamente** — injetam `I<Entity>Repository` via Symbol token
2. **Use-cases NÃO lançam exceções HTTP** — lançam subclasses de `DomainException`
3. **Entidades de domínio NÃO têm decorators** — nem `@Column()`, nem `@IsEmail()`, nem `@Injectable()`
4. **`database/schema/` é persistence model** — importado apenas por mappers e repositórios de infra
5. **Novos códigos de exceção** devem ser registrados em `DomainExceptionFilter.CODE_TO_STATUS`
6. **`IAuthProvider` (e futuros ports)** ficam em `application/ports/`, implementações em `infrastructure/`

### Padrão para criar novo módulo com repositório

```
1. <entity>.entity.ts — plain class, readonly props, static create()
2. <entity>.repository.interface.ts — interface + export const X_REPOSITORY = Symbol(...)
3. <code>.exception.ts — extends DomainException, readonly code = 'SCREAMING_SNAKE'
4. <entity>.mapper.ts — static toDomain(row) + toPersistence(entity)
5. <entity>.repository.ts — DrizzleXxxRepository implements IXxxRepository
6. <feature>-infrastructure.module.ts — { provide: X_REPOSITORY, useClass: DrizzleXxxRepository }
7. <feature>.module.ts — imports infra, declares use-cases, exports [X_REPOSITORY, use-cases]
8. Registrar novo code em DomainExceptionFilter.CODE_TO_STATUS se necessário
```

---

## Regras de UI — Frontend (mobile-first)

**Obrigatório em qualquer novo componente ou página do frontend.**

1. **Mobile-first sempre** — escrever CSS base para ~375px, adicionar `sm:` / `md:` / `lg:` progressivamente. Nunca usar `max-md:` para "corrigir" desktop
2. **Sidebar = drawer no mobile** — `fixed -translate-x-full` por padrão, `translate-x-0` quando aberta; botão hamburger (`md:hidden`) no header
3. **Padding do main**: `p-4 sm:p-6` — nunca `p-6` fixo
4. **Grids**: começar em `grid-cols-1`, escalar com breakpoints (`sm:grid-cols-2 md:grid-cols-3`)
5. **Headings**: escalar da menor para maior — `text-3xl md:text-5xl lg:text-7xl`
6. **Forms**: `w-full max-w-sm mx-auto` — funciona em qualquer tela
7. **Textos longas de nav/breadcrumb**: `overflow-x-auto` ou truncate antes de esconder em mobile
8. **Tabelas**: usar SEMPRE o componente `Table` de `shared/components/ui/table.tsx` (nunca `<table>` cru). Padrão mobile-first: lista de cards no mobile (`sm:hidden`) + `Table` no desktop (`hidden sm:block`).
9. **Menu de ações em linha de tabela**: usar o `DropdownMenu` (radix, portaled) — NUNCA um `<div absolute>` próprio, que é cortado pelo `overflow-x-auto` do container da tabela. (Bug corrigido 2026-06-14.)
10. **Modais de criação/edição**: usar o `Sheet` de `shared/components/ui/sheet.tsx` (painel lateral `side="right"`), com `SheetHeader` + `SheetBody` (scroll) + `SheetFooter` (sticky, Cancelar + submit). Confirmações simples e painéis de histórico continuam em `Dialog`.
11. **Validação de e-mail**: usar o validador do zod (`z.email()` / helper `optionalEmail`), nunca regex manual.
12. **Telefone**: usar `PhoneInput` (`shared/components/ui/phone-input.tsx`) — seletor de país (libphonenumber-js, BR/US no topo) + máscara as-you-type; **armazena E.164** (`+5511999990000`). Schema valida com `/^\+[1-9]\d{6,14}$/`.
13. **Data**: usar `DatePicker` (`shared/components/ui/date-picker.tsx` = Popover + Calendar react-day-picker v10, locale ptBR, dropdowns de mês/ano); valor no form é string `YYYY-MM-DD`.
14. **Endereço do cliente**: internacional genérico — `address` (logradouro/linha 1), `address_line2` (complemento), `city`, `state`, `postal_code`, `country` (ISO-2). Migration `0004`.
15. **Rotas da org usam SLUG, não UUID** — pasta `pages/dashboard/org/[orgSlug]/`. `OrgLayout` resolve `orgSlug`→org via `useOrgs()` e provê o contexto `OrgProvider`; páginas/componentes obtêm o **UUID** via `useCurrentOrg().orgId` para as chamadas de API (`/orgs/:orgId/*` continuam em UUID — backend intocado). Links sempre com `org.slug`. Slug não encontrado → redirect para `/dashboard/organizations`. (Somente slug; sem fallback de UUID.)
16. **Switch/toggle**: usar `shared/components/ui/switch.tsx` (radix). Dropdowns no header/breadcrumb (org-switcher, user-menu) DEVEM ser o `DropdownMenu` portaled (senão renderizam atrás da sidebar `fixed z-50`).
17. **Sidebar ativo por SEGMENTO BASE, não por fim de rota**: `org-sidebar` compara o 1º segmento após `[orgSlug]/` (`settings/cashier` → `settings`). Assim `settings/*` acende "Configurações" e nunca o item "Caixa" (`href="cashier"`). Regressão histórica: `endsWith("/"+href)` acendia Caixa em `settings/cashier` (corrigido 2026-06-16).
18. **react-query + `useEffect`**: NÃO usar `const { data = [] }` como dep de efeito — o default cria **novo array a cada render** → loop "Maximum update depth" (ex.: `PaymentFeesForm` resetando o form). Usar referência estável (`const EMPTY = []` no módulo) e `data ?? EMPTY`. (Bug corrigido 2026-06-16.)
19. **Agenda week/day cobre 0–24h** (`START_HOUR=0`, `END_HOUR=24`). Antes era 7–22, escondendo/clipando eventos fora do horário comercial (corrigido 2026-06-16).
20. **Campos de formulário padronizados** (2026-06-20): `Input`, `SelectTrigger` e `Textarea` compartilham o mesmo visual — **`h-10` (input/select), `rounded-md`, `border-white/[0.08]`, `bg-white/[0.04]`, `focus:border-white/20 focus:ring-1 focus:ring-white/10`**. Botão default também `h-10 rounded-md`. Antes o select era `h-9 rounded-lg` e o input usava tokens `border-input/bg-background` → alturas/bordas divergentes. Não reintroduzir tamanhos diferentes.
21. **Conteúdo centralizado**: o padding e a centralização vivem nos **layouts** (`OrgLayout`/`DashboardLayout` envolvem `children` em `<div className="mx-auto w-full max-w-7xl p-4 sm:p-6">`). Páginas **não** repetem `p-4 sm:p-6` no root (evita padding duplo) — usam só `space-y-*`.
22. **Scroll de container alto (gotcha CSS)**: `overflow-x-auto` força `overflow-y:auto` no mesmo elemento (spec) → criava um scroll interno no calendário (week-view). Para a página inteira rolar, adicionar **`overflow-y-hidden`** ao container com `overflow-x-auto` quando a altura é o próprio conteúdo. (Corrigido 2026-06-20.)
23. **DatePicker — dropdown de mês/ano (2026-06-20)**: o `<select>` nativo do `react-day-picker` v10 (`captionLayout="dropdown"`) abre um popup do SO (branco/azul) **não tematizável por CSS**. Override em `calendar.tsx` via **`components.Dropdown` = `CalendarDropdown`** que usa o nosso `Select` (Radix). O RDP v10 lê **`Number(e.target.value)`** no `onChange`, então o adapter sintetiza `onChange({ target: { value } })` a partir do `onValueChange` do Select (padrão shadcn). Não voltar ao select nativo.
24. **Superfícies públicas só afirmam o que o produto faz (2026-08-16)**: landing, SEO, e-mails de marketing e páginas legais **não podem** conter métrica inventada, logo de integração inexistente ou recurso não implementado sem rótulo explícito de "em breve". Auditoria de 2026-08-16 encontrou na landing 4 métricas fabricadas (`about.tsx`), 5 integrações que existiam **apenas** naquele arquivo (WhatsApp/Instagram/Notion/Zapier/Pix), "lembretes por WhatsApp" (notificação real é in-app + e-mail) e "Começar grátis" para um trial que **exige cartão** (`paymentMethodCollection: "always"`, 60 dias). Ao escrever copy nova: rastrear cada afirmação até um módulo, ADR ou linha de código; número agregado vive em **uma** constante (`features/landing/constants/`), nunca inline. Posicionamento é **vertical de tatuagem explícito**, não "estúdios criativos" — anamnese, consumo de material por sessão e taxa de cartão são o que diferencia de CRM horizontal. Spec completa em `docs/product/landing-page-spec.md`.
25. **Upload de imagem = recorte + compressão client-side antes do envio (2026-08-19)**: todo fluxo de upload de imagem (avatar da conta, anexos de cliente, anexos de ticket de suporte) passa por `ImageCropper` (`shared/components/image-cropper.tsx`) + `ImageCropDialog` (`shared/components/ui/image-crop-dialog.tsx`) antes do POST. Política pura (MIME, dimensão, qualidade, geometria, naming) em `shared/lib/image-compression.ts`; I/O de canvas em `shared/lib/image-crop.ts` — zero dependência nova. **MIME de saída = MIME de entrada** (nunca reconverte PNG→JPEG): preserva a extensão do arquivo e evita path órfão no avatar (que deriva o nome do storage do MIME, e `DELETE` em `storage.objects` é bloqueado por trigger). GIF e PDF são **pass-through** — sem cropper, sem re-encode (`canvas.toBlob("image/gif")` cai silenciosamente para PNG). EXIF de rotação sempre normalizado via `createImageBitmap(file, { imageOrientation: "from-image" })`, com fallback `<img>`+`decode()`. **Aceitação de MIME por fluxo não é uniforme** — confira o backend antes de mexer no `accept` do input: avatar aceita gif (`auth.controller.ts`, regex inclui gif), anexos de cliente aceitam gif+pdf (`customers.controller.ts`), anexos de ticket **não** aceitam gif (`upload-ticket-attachment.use-case.ts`, `ALLOWED_MIME_TYPES` sem gif) — um agente já errou essa suposição para o avatar (achou que rejeitava gif; não rejeita), verificar sempre a validação real, não assumir.
26. **HEIC (padrão de foto do iPhone) não é aceito em nenhum fluxo de upload de imagem (gap conhecido, 2026-08-19)**: reproduzido em staging — o backend devolve 400 com mensagem crua expondo a regex de validação (`"Validation failed (current file type is image/heic, expected type is ...)"`). O frontend hoje só troca essa mensagem por uma amigável ("Formato de imagem não suportado. Envie PNG, JPG, WEBP ou GIF/PDF conforme o fluxo") — **não converte nem aceita HEIC**. Suporte real exigiria conversão HEIC→JPEG no backend (nova dependência de processamento de imagem, ex. sharp+libheif — nenhuma instalada hoje) ou decodificação client-side (inconsistente entre browsers: Safari decodifica HEIC via canvas, Chrome não). Ficou deliberadamente fora de escopo; se for endereçado, é feature nova, não bugfix.

---

## Regras do Monorepo (convenções técnicas)

- **pnpm** obrigatório — nunca npm ou yarn
- Instalar deps: `pnpm add <pkg> --filter @repo/<package>`
- Instalar dev dep global: `pnpm add -Dw <pkg>`
- Toda config TypeScript herda de `@repo/typescript-config/*`
- Merging de classes Tailwind: sempre `cn()` de `@repo/utils`
- Nova task Turborepo: declarar em `turbo.json` antes de usar

---

## Regras de Domínio (produto ink-ops)

### Multi-tenancy

- Banco único no Supabase com isolamento por `org_id` + Row Level Security (RLS)
- Todo dado de estúdio obrigatoriamente carrega `org_id`
- Cada org representa um estúdio de tatuagem
- **Todo controller org-scoped (`/orgs/:orgId/*`) DEVE usar `OrgMembershipGuard`**
  (`modules/auth/guards/org-membership.guard.ts`) — já aplicado em materials, customers e na rota
  `GET /orgs/:orgId/members`. Alternativa válida (orgs module): escopar por
  `findByIdAndAuthId`/`isOwner` no use-case. Regressão histórica: `list-members` vazava
  cross-org por não escopar (corrigido 2026-06-14).
- **super_admin age como owner em QUALQUER org (2026-06-29).** A RLS já permitia
  (`is_super_admin()` em toda policy); o bloqueio era só na app. Padrão: detectar super_admin
  no **caminho de miss** (sem membership) via helper `common/auth/is-super-admin.ts`
  `isSuperAdmin(db, authId)`. Aplicado em: os 3 guards (`OrgMembershipGuard` — inclusive org
  suspensa, `OrgOwnerGuard`, `OrgModuleGuard`); `DrizzleOrgRepository.findByIdAndAuthId`/
  `findBySlugAndAuthId`/`isOwner` (sintetizam role `owner`); e
  `DrizzleMemberRepository.findByAuthId` (sintetiza membro owner com `memberId: ""` → cobre
  `resolveActor` do caixa, `resolveMembership` de serviços, overview, transfer-ownership).
  `transfer-ownership` trata o ator sintetizado rebaixando o owner **real**. `findAllByAuthId`
  (switcher) **não** muda — super_admin não vê todas as orgs na lista; entra por deep-link
  (`GET /orgs/by-slug/:slug`, botão "Gerenciar" no admin). **Visualização (2026-06-29):** no
  `OrgLayout`, super_admin **sempre opera como owner** (override de `role` para "owner", paridade
  com o backend) em qualquer org. Banner em 2 níveis: **forte** ("gerenciando como super_admin")
  quando NÃO é o owner real (funcionário ou não-membro = `actingAsAdmin`); **sutil** ("Acesso de
  super_admin") quando É o owner real (ex.: Ruan/João + Ink House). **Auditoria do fato de ter
  sido síntese de super_admin (PLAT-3, fatia inicial, 2026-08-24)**: `audit_logs.metadata.
  viaSuperAdmin = true` gravado via `AsyncLocalStorage` próprio (`common/request-context/
  acting-context.ts`) — escrita nos 4 pontos de síntese acima + nos 3 guards, leitura só em
  `AuditService.log()` (captura síncrona, antes do hook pós-commit). Detalhe completo no
  addendum do ADR-0013. Não-membro sem super_admin → 404 (sem vazar).
- **Cobertura de auditoria do caixa (PLAT-3, fatia caixa, 2026-08-24) — parcial e
  deliberadamente incompleta.** Só 3 das 9 operações mutantes do módulo emitem
  `audit_logs`: `create-transaction` (`cashier_transaction_created`),
  `upsert-payment-fees` (`cashier_fees_updated`, só quando algum valor muda de fato —
  `previousPercent`/`previousFixedCents` capturados antes do upsert) e
  `upsert-member-commissions` (`cashier_commissions_updated`, mesma lógica de só-quando-
  muda). **Não auditam ainda:** `reverse-transaction`, `correct-transaction`, `transfer`
  (bloqueados pelo GOTCHA de `created_by` heterogêneo, ver acima — um `authId` novo ao
  lado de um campo que já mistura auth id/users.id seria mais confusão, não menos) e
  CRUD de categorias (exigiria converter assinaturas posicionais pra objeto, refactor à
  parte). **`cashier_transaction_created` nem sub- nem sobre-cobre "criação de
  lançamento" no sentido amplo:** pagamento de serviço (`register-payment`,
  `create-service`, `cancel-service`, `correct-service-payment`) e as duas pernas de
  `transfer` criam linhas em `transactions` sem passar por `create-transaction` — não
  auditados por esta ação. Metadata sempre com `attributedTo` (quem recebeu o
  lançamento, quando resolvido por `resolveCreatedBy`) separado de `actorId` (sempre
  quem fez a chamada, via `logByAuthId`) — nunca a mesma coisa quando um owner lança em
  nome de outro membro. Nenhum `description` (texto livre) nem PII no metadata dos 3
  eventos. materials/services/customers/calendar/support seguem **sem nenhuma**
  auditoria — próximas iterações da trilha genérica, nessa ordem de risco.
- **Endpoint agregador multi-módulo (ex. `GET /orgs/:orgId/overview`) deve filtrar seção por
  `hasModuleAccess`, não confiar em não ter `@RequireModule` na rota (2026-07-30).** Todo
  controller org-scoped de módulo único já tem `@RequireModule`/`OrgModuleGuard`
  (services, calendar, materials, customers, cashier); um endpoint que agrega dado de
  vários módulos numa resposta só (overview) fica **fora** desse guard por natureza — mas
  isso não autoriza devolver dado do módulo negado. `GetOverviewUseCase` só busca (nunca
  busca-e-esconde) a seção de cada módulo se `hasModuleAccess` for true, e a chave fica
  **ausente** do payload quando negada, nunca `[]` (array vazio seria indistinguível de
  "módulo liberado sem dados"). O frontend replica o mesmo binário via
  `features/overview/lib/overview-visibility.ts` (reusa `canAccessModule` de
  `features/dashboard/lib/nav.ts`, mesmo padrão do `org-sidebar.tsx`) — mas o gate real é
  o do backend, o do front é só UX. **Acesso a módulo é binário, sem granularidade fina**
  (ex. "ver quantidade sem ver valor" foi decisão explícita rejeitada em reunião de
  produto) — não introduzir sub-permissão por valor ou por ação dentro de um módulo já
  liberado.
- ✅ **RLS habilitada e enforced no backend** (defense-in-depth, ativada 2026-06-14 — ver ADR-0005):
  - Repositórios injetam `DRIZZLE` (pool **`app_user`**, `NOBYPASSRLS`). O `RlsInterceptor`
    global abre uma transação por request com `set_config('request.jwt.claims', {sub:authId}, true)`,
    e as policies de `0000` (baseadas em `auth.uid()`) fazem o isolamento no nível do banco.
  - **Use `DRIZZLE_ADMIN` (BYPASSRLS) apenas** em: guards que consultam o banco
    (`OrgMembershipGuard` roda antes do interceptor), bootstrap (`UserRepository.create` no
    sign-up; `OrgRepository.create` insere o 1º owner membership), cron/cross-org (sem
    contexto de request/sessão, ou legitimamente multi-tenant — ex. fila admin de
    `support`), e **escritas privilegiadas escopadas quando múltiplas classes de ator
    escrevem a mesma tabela pelo mesmo pool `DRIZZLE`** (RLS autoriza por linha, não por
    coluna — não dá para o banco distinguir "campo setado pelo backend" de "forjado pelo
    cliente" na mesma conexão/policy; ver ADR-0021, módulo `support`: `create-ticket`/
    `add-customer-response`/`reopen-ticket`/`upload-ticket-attachment` do portal usam
    `DRIZZLE_ADMIN` com `org_id` vindo do path (já autorizado pelo `OrgMembershipGuard`
    antes do use-case), nunca de um campo livre do body). Fora desses casos = `DRIZZLE`.
  - `DATABASE_URL` = conexão admin (postgres); `DATABASE_APP_URL` = conexão `app_user`.
  - O guard de aplicação (`OrgMembershipGuard`) **continua obrigatório** — RLS é camada extra,
    não substitui o 403 explícito por endpoint.
- ⚠️ **GOTCHA (2026-08-19, achado via debugger real, não hipótese): nunca chamar
  `db.transaction()` do Drizzle sobre a conexão `DRIZZLE` dentro de um request.** O
  `RlsInterceptor` já abre a transação do request inteiro (`RlsContext.runWithClaims`:
  `pool.connect()` + `BEGIN` + `SET LOCAL request.jwt.claims`) e o Proxy `DRIZZLE` delega
  toda chamada pro mesmo client via `AsyncLocalStorage`. O driver `node-postgres` do
  drizzle-orm só isola uma conexão nova para `.transaction()` quando `this.client
instanceof Pool` — como o client em uso já é um `pg.Client` (resultado de
  `pool.connect()`), ele reaproveita o MESMO client: o `BEGIN` aninhado vira no-op
  (Postgres emite warning, continua na transação já aberta) e o `COMMIT` do bloco
  `.transaction()` faz o **commit real e prematuro da transação inteira do request**,
  resetando `request.jwt.claims` (era `SET LOCAL`, escopo de transação) no meio da
  execução. Qualquer leitura RLS-dependente **depois** desse ponto, na mesma request, roda
  como se não houvesse usuário autenticado — `is_org_owner`/`is_org_member` (via
  `auth.uid()`) passam a negar tudo, silenciosamente (sem exceção). Se o resultado vazio for
  cacheado (`TtlCache`, processo inteiro, TTL 1h — ver `common/cache/ttl-cache.service.ts`),
  o efeito persiste por até 1h para qualquer leitor da mesma chave/org, não só quem
  disparou o bug. Sintoma clássico: um upsert que "nunca salva" (a escrita em si roda ANTES
  do commit prematuro e vai pro banco certinho; só a leitura seguinte, dentro do mesmo
  request/response, é que volta vazia/default). **Discriminante real: usar `DRIZZLE`
  (`this.db`), não usar `.transaction()`** — `DRIZZLE_ADMIN` (`this.admin`) é
  `drizzle(new Pool(...))`, e o driver isola conexão nova sempre que `this.client
instanceof Pool` (`node-postgres/session.js`), então é imune ao bug mesmo chamando
  `.transaction()`. Confirmado por `database-guardian` (2026-08-19, auditoria dos 6 sites
  de `.transaction(` no backend): **vulneráveis** (sobre `DRIZZLE`) —
  `drizzle-member-commission.repository.ts:82` (`supersede`, bug reportado em P-1),
  `drizzle-member.repository.ts:270` (`transferOwnership` — **instância viva confirmada**:
  `TransferOwnershipUseCase` chama isso e, em seguida, `AuditService.logByAuthId` faz uma
  leitura via `DRIZZLE` que roda pós-commit-prematuro, gravando o log de transferência de
  propriedade **sem `actorId`**, silenciosamente — trilha de auditoria perdida, severidade
  high), `drizzle-anamnesis-form.repository.ts:77` (`createVersion` — **latente**, hoje sem
  leitura RLS-dependente depois, vira bug vivo assim que alguém adicionar um
  `auditService.logByAuthId` ali, padrão comum nos demais use-cases owner-only); **imunes**
  (sobre `DRIZZLE_ADMIN`, apesar de também usarem `.transaction()`) —
  `drizzle-org.repository.ts:122`, `drizzle-ticket.repository.ts:246`,
  `drizzle-transaction-runner.ts:16` (support). **Fix estrutural APLICADO (2026-08-19,
  `database.module.ts`)**: o Proxy `DRIZZLE` detecta transação já aberta no
  `AsyncLocalStorage` (`rlsStorage.getStore()`) e, só nesse caso, faz `transaction()` rodar
  o callback (recebendo o próprio Proxy, não o `db` cru — necessário pra uma transação
  aninhada DENTRO do callback também ser interceptada) dentro de um **`SAVEPOINT`**
  (`SAVEPOINT spN` / `ROLLBACK TO SAVEPOINT spN` em erro / `RELEASE SAVEPOINT spN` em
  sucesso), **não** um passthrough puro (passthrough faria um erro capturado pelo caller
  ficar com escritas parciais aplicadas, mudando o contrato de quem chama). Sem
  `rlsStorage.getStore()` (fora de request), comportamento inalterado (transação real sobre
  `Pool`). Um 2º parâmetro de config (`isolationLevel`/`accessMode`) faz a interceptação
  lançar erro explícito (não pode ser honrado dentro de uma transação já aberta; nenhum
  caller usa isso hoje, é defesa contra reintrodução silenciosa).
  **Corolário (aplicado no fix de P-1):** com o COMMIT real agora só acontecendo no fim do
  request (não mais prematuro no meio), qualquer efeito colateral NÃO-transacional
  (cache de processo, `DRIZZLE_ADMIN` autocommit, envio de e-mail) que rode DEPOIS de uma
  escrita mas ANTES do fim do request passa a rodar antes do commit real — o oposto do
  problema original. Resolvido para o caso da comissão removendo o cache de leitura
  inteiramente (`findActiveByOrg` virou select direto, sem `TtlCache` — único consumidor
  era exibição, sem racional de performance documentado pro risco). **Corrigido
  (2026-08-20, `database.module.ts` + `audit.service.ts`):** `RlsStore` ganhou
  `postCommitHooks` e há uma função exportada `registerPostCommit(fn)`. Dentro de um
  request, ela empilha o efeito e `RlsContext.runWithClaims` drena a fila **depois** de
  `client.query("COMMIT")` ter sucesso (sequencialmente, com `try/catch` por hook que só
  loga — um hook que falha não derruba o request nem impede os seguintes); se o `COMMIT`
  falhar, o fluxo vai pro `catch` externo (`ROLLBACK`) e **nenhum** hook roda. Fora de
  request (cron, bootstrap, endpoint público sem `authId`, teste direto) não há store e o
  efeito roda imediatamente, sem `await` do caller. `AuditService.log` passou a usar isso:
  o INSERT via `DRIZZLE_ADMIN` (pool separado, autocommit) só acontece após o commit real,
  fechando o risco de `transferOwnership` acima — não existe mais log de uma
  transferência/exclusão que não aconteceu.

  ⚠️ **GOTCHA (2026-08-20): dentro de um hook de `registerPostCommit`,
  `rlsStorage.getStore()` é `undefined`.** Os hooks rodam **depois** que `rlsStorage.run()`
  já retornou, então o `AsyncLocalStorage` está vazio. Três consequências, todas armadilha
  para hook futuro:
  1. **Nada de `DRIZZLE` dentro de hook.** O Proxy cai no `fallback` (pool `app_user`
     **sem** `request.jwt.claims` — o `SET LOCAL` morreu no COMMIT), então `auth.uid()` é
     NULL e as policies negam tudo: leitura volta **0 linhas** e escrita é rejeitada. É
     **fail-closed, não vazamento cross-org** — não escalar como incidente de tenancy, mas
     é falha silenciosa. Hook só pode usar `DRIZZLE_ADMIN` com o `orgId`/`actorId`
     **passados explicitamente por closure**, resolvidos ANTES de registrar (é por isso
     que `AuditService.logByAuthId` faz o `findByAuthId` fora do hook — movê-lo pra dentro
     produziria `actorId: null` silencioso).
  2. **Hook não pode referenciar por FK uma linha que a transação do request apagou.** O
     hook roda pós-commit: a linha já não existe e o INSERT morre com `23503`, engolido
     pelo `catch` por hook. Caso real: `audit_logs.org_id` → `organizations.id`
     (`ON DELETE SET NULL`, não deferrable) em `DeleteOrgUseCase` — logar com `orgId` da
     org recém-apagada perde o registro da exclusão. Padrão correto: `orgId: null` + id no
     `metadata`/`entityId` (`entity_id` não tem FK).
  3. `registerPostCommit` chamado **de dentro** de um hook executa na hora (não há mais
     store) e sem `await` — não encadear hooks.

### Modelo de usuários e roles

Princípio: **usuário único, multi-role, multi-org**

```
Platform User (único por email/auth)
  ├── platform_role: super_admin | user
  └── memberships:
       ├── Org A → org_role: owner | employee
       └── Org B → org_role: employee
```

- Um user pode ser dono de N orgs (rede de estúdios) — V1 limita a 1 org criada
- Um user pode ser funcionário de N orgs (tatuador freelancer)
- Um user pode acumular platform_role + org_role (caso Ruan/João Pedro: super_admin + owner da Ink House)

#### Roles da plataforma (`platform_role`)

- `super_admin`: tudo que owner faz + gerenciar assinaturas, painel financeiro da plataforma, todas as orgs/users/acessos
- `user`: acesso às orgs em que tem membership

#### Roles dentro da org (`org_role`)

- `owner`: gestão total da org
- `employee`: acesso conforme permissões configuradas pelo owner (granularidade a definir)

**Visibilidade por funcionário ("só vê o que é dele") — backend.** Regra de produto: o
funcionário só enxerga dados referentes a ele; o owner vê tudo e pode lançar **em nome de**
um funcionário. Estado por módulo (2026-06-21):

- **Services** ✅ — `list-services` força `performedBy=self` p/ funcionário; owner escolhe o
  profissional (`resolvePerformer`). Coluna `services.performed_by` + `created_by`.
- **Agenda/Calendar** ✅ — `list-calendar-events` força `assignedTo=self` p/ funcionário;
  owner vê todos ou filtra por membro. `create-calendar-event` aceita `assignedTo` (owner
  cria em nome de membro ativo, validado por `repo.isOrgMember`; funcionário força self).
  Frontend: `EventForm` mostra "Para o membro" só p/ owner na criação.
- **Caixa/Transações** ✅ — `CashierController` agora é `AuthGuard + OrgMembershipGuard`
  (membros acessam); `OrgOwnerGuard` a **nível de método** em reverse/correct/transfer/
  PUT fees/POST categories. `list-transactions`/`get-balance`/`get-balance-history` escopam
  por `transactions.created_by=self` p/ funcionário (helper `resolveActor`);
  `create-transaction` aceita `createdBy` (owner em nome de, validado;
  funcionário força self). `created_by` passou a guardar **users.id (app)**, não auth id.
  Frontend: `Caixa` visível a todos no nav; `CashierPage` esconde Transferir/estorno/
  correção e o seletor "Em nome de" p/ funcionário; mostra "Seus lançamentos" no subtítulo.
  Verificado por teste de 3 contas (dono + func A + func B) em
  `docs/testing/employee-visibility-tests.md`.
  - **Errata preserva autoria (TX-1, 2026-06-22):** `correct-transaction` lê o
    `created_by` do lançamento original e repassa via `trustedCreatedBy` (campo interno
    de `create-transaction` que pula `resolveActor`/`resolveCreatedBy`) — assim o
    corrigido **continua pertencendo ao funcionário**, não migra para o owner que corrige.
  - **GOTCHA — `created_by` nem sempre é `users.id`, apesar da regra acima:**
    `transfer.use-case.ts` grava as duas pernas com `input.createdBy`, e
    `cashier.controller.ts` (endpoint de transferência) passa `user.id` (**auth id** do
    Supabase, não `users.id`) — achado pela `reviewer` durante a fatia de auditoria do
    caixa de PLAT-3 (2026-08-24). Uma perna de transferência corrigida propaga esse auth
    id pra frente via `trustedCreatedBy`, então o mesmo bug alcança `correct-transaction`.
    Pré-existente, não introduzido por essa fatia; corrigir exige backfill de dados
    históricos (não dá pra saber, a-posteriori, quais linhas de `transactions.created_by`
    são auth id vs. users.id sem reprocessar caso a caso) — registrado como item futuro,
    não uma tarefa desta fatia. Ver "Cobertura de auditoria do caixa" abaixo — é por isso
    que estorno/correção/transferência não têm auditoria ainda.

**Navegação por papel (multi-org/multi-papel) — frontend.** Um usuário pode ser `owner`
de N orgs e `employee` de outras N ao mesmo tempo. `GET /orgs` retorna `role` por org;
a UI deve refletir o papel da org _ativa_:

- `NavItem.roles?: Array<"owner"|"employee">` em `features/dashboard/lib/nav.ts` — item sem
  `roles` é visível a todos; com `roles`, só aparece para quem tem o papel. Hoje
  `Caixa` e `Configurações` são `roles:["owner"]`.
- `org-sidebar.tsx` filtra os itens por `org.role` e **não renderiza seção vazia**.
- `isOwnerOnlyPath(subpath)` (derivado das `roles` do nav principal + `SETTINGS_NAV`) +
  guard no `OrgLayout`: funcionário acessando rota owner-only direto pela URL é
  redirecionado p/ `/overview`. Granularidade por sub-path: `settings/agenda` é
  acessível ao funcionário (configura a própria agenda); demais `settings/*` são
  owner-only. O índice `/settings` redireciona por papel (owner→general,
  funcionário→agenda) e o `OrgSettingsLayout` filtra as abas por `org.role`.
- `org-switcher.tsx` mostra o papel por org (`Proprietário`/`Funcionário`) para orientar
  quem transita entre orgs.
- A filtragem de nav é **cosmética**: a fonte de verdade é o `OrgOwnerGuard` no backend
  (rotas owner-only respondem 403). Nunca confiar só no nav para autorização.

**Roteamento Next (pages router) — gotchas (2026-06-29).**

- **Lista + detalhe NÃO podem ser `foo.tsx` + `foo/[id].tsx`** (arquivo e diretório de mesmo
  nome). É ambíguo: a rota dinâmica filha cai em **404 no dev** (o `next build` até passa,
  mascarando). Usar sempre `foo/index.tsx` + `foo/[id].tsx`. Foi a causa do bug "ao abrir
  `/admin/orgs/[id]` o super_admin era jogado para fora" — corrigido movendo
  `admin/orgs.tsx`→`admin/orgs/index.tsx` e `admin/users.tsx`→`admin/users/index.tsx` (commit 54197b2).
- **`pages/404.tsx` faz `router.replace("/dashboard/organizations")`** — qualquer 404 vira um
  **redirect silencioso** para a lista de orgs, o que **mascara** erros de rota (parece
  "redirect inesperado" em vez de 404). Ao depurar "fui redirecionado para fora", checar antes
  se a rota está em 404.
- Mover/renomear arquivos de página **com o dev server rodando** corrompe o manifest do Next
  (404 em rotas válidas, `ERR_CONTENT_LENGTH_MISMATCH` em chunks antigos). Recuperação: parar o
  dev, `rm apps/frontend/.next`, `pnpm dev` (mesma receita de [[env_turbopack_hydration]]).
- Convite de funcionário **não** passa pelo Supabase admin — usa nosso token
  (`org_invitations`): lookup público por token, accept exige auth; login/cadastro
  carregam o token de volta para `/invite/accept`.
- **Recusar convite (INV-1, 2026-06-22)**: `POST /invitations/decline` (auth, só o
  convidado — e-mail bate, status pending) **remove** o convite (não só cancela), via
  `invitationRepo.delete` (admin). Assim o owner pode **reenviar o fluxo** (o `create`
  já faz upsert por `(orgId,email)` regenerando o token). Front: botão "Recusar" na tela
  de aceite → `/dashboard/organizations`.
- **Guard inverso `GuestGuard` (2026-07-15)**: usuário **logado** que abre página de auth é
  redirecionado para a área privada. Espelho de `AuthGuard` em
  `features/auth/components/guest-guard.tsx` (mesmo spinner enquanto `loading`, lógica
  invertida: `if (!loading && user) router.replace(...)`). Aplicado via `getLayout` em
  `pages/auth/login|signup|recover.tsx`. Alvo: `/invite/accept?token=` se houver `?invite=`
  na URL (paridade com login/signup-form), senão `/dashboard/organizations`.
  **`reset-password.tsx` fica de fora** — é fluxo por token (`type=recovery`) que precisa
  funcionar mesmo com sessão ativa. Como a sessão é client-side (`inkops_session` no
  localStorage, sem middleware), o gate depende de `loading===false` antes de checar `user`.

### Organizações

**Fluxo de criação único (V1):**
`Usuário se cadastra → cria org → configura billing (plano + meio de pagamento) → acessa org`

- V1: limite de 1 org criada por usuário
- Acesso à org só liberado após billing configurado
- Futuro: cobrança de múltiplas orgs (modelo a definir)

### Clientes (customers)

- `customer` é entidade de dados gerenciada pelo estúdio, sem acesso ao sistema na V1
- Schema tem `user_id` nullable — preparado para vínculo futuro com account da plataforma
- Futuro: cliente pode criar conta e ver histórico entre orgs que frequentou
- **Campos núcleo padronizados** (reunião 11/06): Nome, Telefone, E-mail, **Cidade**, Origem — coluna `customers.city` **implementada** (migração 0002, 2026-06-14)
- **Créditos:** considerado específico da Ink House → **fora da estrutura núcleo** da plataforma. Substituto futuro: **cashback opcional por org** (com regras de expiração)
- **Observações + anexos:** cada cliente pode ter observações e anexos (imagem/documento). Implementar como **estrutura genérica** de documentação do cliente (ex.: ficha de anamnese), não uma feature de "ficha" específica

### Tipos de serviço

- Na v1 eram enums fixos (`tattoo | body_piercing`)
- Na v2 são um **cadastro configurável por org** — tabela `service_types` com `UNIQUE(org_id, name)`
- Mesmo padrão para `material_categories`
- Impacto: não há enums de domínio para serviços — tudo é row no banco

> ⚠️ **Origem do cliente (`customer_origins`) — refinamento (reunião 11/06):** ao contrário de
> serviços/materiais, a **origem do cliente** passa a ser **categorias padronizadas** (não livre
> por org), para viabilizar **relatórios cross-org**. Canais: Indicação · Rede social do
> profissional · Rede social do estúdio. Estrutura final a confirmar (enum fixo vs. catálogo
> global gerenciado pelo super_admin).

### Conta do usuário (account) — implementado 2026-06-16

- **Perfil** (`/dashboard/account/profile`): edita nome, e-mail e foto via `PATCH /auth/me`
  (`UpdateMeUseCase` no auth module). E-mail é a identidade de login → atualizado no Supabase via
  `IAuthProvider.updateEmail` (`admin.updateUserById`, `email_confirm:true`) antes do DB. Frontend:
  hook `useMe` (`GET/PATCH /auth/me` + `uploadAvatar`).
- **Foto de perfil — upload (2026-06-20):** bucket **`avatars`** (Supabase Storage, migration
  `0010_avatars_bucket.sql`): público, 5 MB, mimetypes de imagem. Upload **só pelo backend** com
  `service_role` (bypassa RLS de `storage.objects`) — `POST /auth/me/avatar` (`FileInterceptor` +
  `ParseFilePipe` ≤5 MB/imagem) → `IStorageProvider`/`SupabaseStorageProvider` grava em
  `"<authId>/avatar.<ext>"` (`upsert`) → retorna **URL pública + cache-bust `?t=`** → salva em
  `users.avatarUrl`. Frontend faz `multipart` (apiRequest **omite `Content-Type` p/ `FormData`**).
  ⚠️ Não dá `DELETE` direto em `storage.objects` (trigger bloqueia) — usar a Storage API.
- **Acesso** (`/dashboard/account/access`): troca de senha **por e-mail** — botão dispara
  `forgotPassword(user.email)`; o link do e-mail abre `/auth/reset-password`, que **recupera a sessão
  pelo token do link** e mostra a tela de nova senha (fluxo reusa o de recuperação existente).
- **Org switcher** (breadcrumb) tem item final "Ver todas as organizações" → `/dashboard/organizations`.
- **Link de reset de senha nunca usa o `action_link` do Supabase (2026-08-01, bug real)**:
  esse link aponta pro `/auth/v1/verify` do próprio Supabase, que **consome o token via GET** —
  scanners de e-mail (Outlook Safe Links, proxies corporativos) batem nesse GET antes do clique
  real e invalidam o token; e o Supabase manda os tokens resultantes no **hash** (`#access_token=`),
  que o form só lia via **query string** (bug duplo). Fix: `generatePasswordResetLink` monta o
  próprio link (`${frontendUrl}/auth/reset-password?token_hash=...&type=recovery`) a partir de
  `data.properties.hashed_token` do `generateLink`; `resetPassword` troca o token por sessão via
  `client.auth.verifyOtp({ token_hash, type: 'recovery' })` — só no **submit** do form, nunca num
  `useEffect` de mount (senão reintroduz o problema do scanner). Larmony tinha o mesmo bug (código
  idêntico) — não copiar de lá sem aplicar o mesmo fix.

### Relação serviço ↔ transação financeira

**Decisão crítica**: transações são agnósticas — não referenciam serviços.
É o **service** quem aponta para a transaction via `payment_transaction_id` (FK nullable).

```
transactions (agnóstica, append-only)
  ← services.payment_transaction_id → transactions.id
```

- Ordem de criação: criar transaction primeiro → criar service com FK para ela (atômico no backend)
- Transações nunca são deletadas ou atualizadas (append-only por design)
- Um serviço pode não ter transação ainda (pagamento pendente → `payment_transaction_id = null`)

### Billing / assinatura (Stripe) — implementado (ADR-0016 M11, ADR-0023, ADR-0024)

Produto: "assessoria". Quatro configurações possíveis (gerenciadas pelo super_admin):

1. **Gratuita** — para a própria Ink House
2. **Trial** — via Checkout com cartão obrigatório (`trial_period_days` nativo do Stripe)
3. **Preço cheio** — configurado em `billing_plans` (banco), não hardcoded
4. **Valor alterado** — comp/desconto local via `EntitlementsService` (ver ADR-0016)

> ⚠️ Os valores R$400/R$2.000/R$4.200 mencionados aqui em versões anteriores desta nota eram
> a estimativa **pré-implementação**; hoje **`billing_plans` (banco) é a fonte de verdade** do
> preço vigente de cada plano — não hardcoded em `PLAN_CATALOG` (que virou seed inicial). Ver
> ADR-0023 para o catálogo administrado por super_admin (planos + cupons).

- Grace period configurável após inadimplência
- Estrutura de produtos Stripe desacoplada por produto
- **Modelo multi-preço (ADR-0024):** `billing_plans` guarda só dados de produto (nome,
  descrição, `stripeProductId`); preço vive em `billing_plan_prices`, N linhas por plano — uma
  por intervalo de cobrança (`monthly`/`semiannual`/`annual`), cada uma independentemente
  editável/habilitável. Dois índices únicos **parciais** (`WHERE active`) — `(plan_id,
interval)` e `lookup_key` — garantem só uma linha vigente por par; preços antigos nunca são
  apagados, só desativados (`deactivateById`, que limpa `active` e `lookup_key` juntos).
- **Nenhum use-case deve tentar `PATCH` de valor num objeto Stripe imutável** (ADR-0023):
  `unit_amount` de um `Price` existente, ou `percent_off`/`amount_off`/`duration` de um
  `Coupon` existente. "Editar preço" de um plano é sempre: criar novo `Price` com
  `transfer_lookup_key: true` + arquivar o antigo numa chamada separada
  (`RotatePlanIntervalPriceUseCase`, por (plano, intervalo) — migra automaticamente os
  assinantes elegíveis para o novo Price). "Editar cupom" só é possível via **Promotion Code**
  (`active`/`metadata`), nunca no `Coupon` em si — Coupon e Promotion Code são sempre criados
  juntos, 1:1 (`billing_coupons.stripe_coupon_id`/`stripe_promotion_code_id` `UNIQUE`).
- **`trial_consumed` só transita `false→true` a partir do sync do Stripe, nunca no fluxo de
  criação de checkout (2026-08-17, ADR-0016 addendum).** `CreateCheckoutSessionUseCase` não
  escreve essa coluna — a decisão é do predicado `shouldMarkTrialConsumed`
  (`modules/subscriptions/domain/subscription-sync.ts`), chamado só em dois lugares:
  `HandleStripeWebhookUseCase::syncNormalizedSubscription` (webhook `checkout.session.completed`/
  `customer.subscription.updated`) e `ReconcileSubscriptionsUseCase` (cron, rede de segurança
  para webhook perdido, mas só alcança orgs já com `stripe_customer_id` **e**
  `stripe_subscription_id` preenchidos). Condição: `trial_end` do Stripe vem preenchido —
  nunca marcado por criar a checkout session, e **nunca resetado em runtime** (a migration
  `0050_subscriptions_restore_unstarted_trials`, que reverteu `trial_consumed` para orgs
  atingidas pelo bug histórico, é reparo de dado one-off, não um caminho de código; não
  reintroduzir lógica de "desmarcar" trial fora de migration explícita). Bug histórico:
  marcar na criação da checkout session queimava o trial de 60 dias em qualquer checkout
  abandonado — corrigido nesta data.
- **`lookup_key`/`stripeProductId` ausentes numa linha ATIVA de `billing_plan_prices` são
  irrecuperáveis por boot (2026-08-19, bug real corrigido).** Causa: `ReconcilePlanCatalogUseCase`
  desativa uma linha divergente/sumida no Stripe via `deactivateById` (limpa `active` e
  `lookup_key` juntos); se o super_admin reativa o intervalo depois (`SetPlanIntervalActiveUseCase`),
  a linha volta a `active: true` mas com `lookup_key` NULL — e `SyncPlanCatalogUseCase.onModuleInit`
  **não repara isso** (`syncPrice` encontra a linha existente e retorna `"unchanged"`, nunca
  repopula). Isso fazia `RotatePlanIntervalPriceUseCase` falhar com "plano/preço sem
  produto/lookup_key associado" até o próximo restart — e mesmo assim só se o restart
  coincidisse com o Stripe ainda tendo o produto correto. Fix: `PlanPriceLinkageService`
  (`modules/subscriptions/application/plan-price-linkage.service.ts`) resolve o par sob
  demanda — fast path se `stripeProductId`+`lookupKey` já existem (nenhuma chamada ao Stripe);
  senão consulta `gateway.retrievePrice` (Stripe é autoritário); senão deriva
  `${productKey}-${interval}` (mesma regra de `UpsertPlanIntervalPriceUseCase`). Usado por
  `RotatePlanIntervalPriceUseCase` (autocura antes de lançar `InvalidBillingPlanUpdateException`)
  e `SetPlanIntervalActiveUseCase` (repõe `lookup_key` na mesma escrita ao reativar). **Não é**
  o sync manual global removido em ADR-0024 — opera só sobre um par (plano, preço) específico,
  sob ação explícita do admin, sem ler `PLAN_CATALOG` nem rotacionar Price.
- **Campos de apresentação `highlighted`/`features` em `billing_plans` (migration 0054 —
  renumerada de 0051 no merge para `development`, colisão com `0051_member_commissions`/
  `0052_customer_self_service_invites`/`0053_audit_action_customer_self_service` já
  mergeadas, 2026-08-19) vivem em colunas dedicadas, nunca em `metadata`.** `metadata` é
  sobrescrito pelo round-trip do Stripe em `UpdateBillingPlanProductUseCase` (o
  `result.metadata` que volta do `paymentGateway.updateProduct`) e no webhook
  `product.updated` — qualquer coisa guardada lá seria apagada na próxima edição/sync.
  Editados só por super_admin via `PATCH /admin/billing/plans/:key/product`; **nunca**
  entram no `set:` do `onConflictDoUpdate` de `DrizzleBillingPlanRepository.upsert` (usado
  por `SyncPlanCatalogUseCase` no boot) — se entrassem, todo boot resetaria a curadoria do
  super_admin para o default, já que `PLAN_CATALOG` (seed) não carrega esses campos.

### Gaps de reunião aplicados (2026-06-20) — migrations 0011–0013

Auditoria código vs. transcrições → aplicados nos módulos já construídos:

- **Caixa = owner-only:** `CashierController` usa **`OrgOwnerGuard`** (novo, em `auth/guards/`) —
  funcionário recebe 403 ("funcionário não tem acesso ao caixa"). Nav esconde Caixa p/ employee.
- **Categoria de transação:** tabela `transaction_categories` (por org, UNIQUE org+name) +
  `transactions.category_id` (FK, `onDelete: set null`). Seed default por org (Serviço/
  Funcionário/Material/Conta/Reforma/Transferência/Outros) na criação de org + migration p/
  orgs existentes. **Descrição permanece.** Rotas `GET/POST /orgs/:orgId/cashier/categories`.
- **CRUD completo de categorias (M5, migration 0025):** coluna `is_protected` (default
  `false`) marca as 7 categorias seed como fixas. `PUT/DELETE /orgs/:orgId/cashier/categories/:id`
  (owner-only). Regras de negócio: **renomear é permitido mesmo em categoria protegida**
  (rename é cosmético, não afeta vínculos); **excluir categoria protegida** → 409
  `TRANSACTION_CATEGORY_PROTECTED`; **excluir categoria em uso é permitido** — `category_id`
  das transações antigas simplesmente vira `null` (decisão de produto, não bloqueia); renomear
  para um nome já usado na org → 409 `TRANSACTION_CATEGORY_NAME_CONFLICT`. UI: dialog
  "Categorias" em `cashier-page.tsx` (owner-only), categorias protegidas mostram badge e
  ocultam o botão de excluir.
- **Transferência entre meios:** `POST /orgs/:orgId/cashier/transfers` → `TransferUseCase` cria
  **2 transações** (saída no método origem + entrada no destino), sem taxa.
- **Membro ativo/inativo:** `org_memberships.enabled` (default true). `SetMemberStatusUseCase`
  (owner; **bloqueia desativar o último owner ativo** → `LAST_ACTIVE_OWNER` 409). **`OrgMembershipGuard`
  agora exige `enabled=true`** — membro inativo perde acesso. Rota `PATCH .../members/:id/status`.
- **Material:** `archived_at` (arquivar em vez de excluir quando em uso; lista exclui arquivados
  por default, `?archived=true`) + `last_used_at` (setado em baixa/ajuste negativo; ordenação
  padrão por mais recente). Busca por nome (`?q=`, ilike). Rotas `POST :id/archive` / `:id/unarchive`.
- **Conferência de estoque:** `organizations.stock_check_interval_days` + `stock_verifications`
  (+ `_items`). `CreateStockVerificationUseCase` (grava físico×sistema; `reconcile` gera
  `manual_adjustment`). **Cron** `POST /internal/cron/stock-check-reminders` (`CronSecretGuard`,
  novo enum `notification_type.stock_check_reminder`) notifica owners. UI em `settings/stock` (owner).
- **Origem do cliente:** seed das 3 categorias por org + `GET /orgs/:orgId/customers/origins` +
  Select no form. **Cidade** exibida na listagem de clientes.
- **Anexos do cliente:** bucket **privado** `customer-files` (migration `0012`) +
  `customer_attachments`. `IStorageProvider` ganhou `uploadFile/createSignedUrl/removeFile`
  (genéricos). Rotas `POST/GET/DELETE /orgs/:orgId/customers/:id/attachments` (GET = signed URLs).
- **Export CSV** de clientes: `GET /orgs/:orgId/customers/export` (text/csv; respeita filtro).
- ⚠️ **Gotcha (repetido):** ao adicionar campo a uma _entity_ de domínio, adicione nos **3**
  lugares — props interface, `readonly` field e atribuição no constructor — senão não serializa
  (pegadinha que ocultou `transaction.categoryId` até o teste e2e).
- **Fora do escopo (por design):** super-admin panel, módulo de Serviços, Google Calendar, push
  externo, caixa-poupança, tema/exclusão de conta.
- **Preview inline vs download forçado — Supabase Storage (2026-07-31)**: `createSignedUrl(bucket,
path, expires, downloadFileName?)` do `IStorageProvider` força `Content-Disposition: attachment`
  quando `downloadFileName` é passado — sem ele, a URL é inline (`<img>`/`<iframe>` funcionam
  direto). **Descoberta que evita assinar duas vezes**: no supabase-js, `download` **não entra na
  assinatura** — é query param concatenado à URL já assinada (`?download=<nome>` ou
  `&download=<nome>`). Uma única `createSignedUrl`/`createSignedUrls` basta para os dois links;
  a versão de download é só `url + (url.includes('?') ? '&' : '?') + 'download=' +
encodeURIComponent(nome)`. Para listagens, usar `createSignedUrls` (plural) — 1 chamada HTTP
  para N arquivos, mapeando o resultado por `path` (a ordem de retorno não é garantida), nunca
  por índice, e omitindo entradas com `signedUrl: null`/`error` sem derrubar as demais.
- **Travar extensão de arquivo por composição, não validação (2026-07-31)**: quando um campo de
  nome de arquivo é editável pelo usuário (rename, ou nome-antes-do-upload), não valide que a
  extensão foi preservada — **componha** o nome final no backend a partir da extensão real
  (`storage_path` já salvo, ou `file.originalname` no upload) + só o nome-base vindo do usuário.
  Não existe caminho de input que quebre a extensão, então não precisa de exceção de domínio nova.
  Bônus: conserta de graça qualquer arquivo legado salvo sem extensão no próximo rename.
  Utilitário `extensionOf`/`splitFileName`/`joinFileName` (extrai o _basename_ antes de procurar
  a extensão) é duplicado em `apps/frontend/src/shared/lib/file-name.ts` e
  `apps/backend/src/common/lib/file-name.ts` — os dois apps não compartilham workspace para isso.

### Caixa & Financeiro — implementado (2026-06-16)

- **Backend** `modules/cashier/**` (espelha materials), **frontend** `features/cashier/**`,
  migration `0009`. Rota `orgs/:orgId/cashier` (`AuthGuard`+`OrgMembershipGuard`).
- **Split bruto/taxa/líquido** em `transactions` (migration `0009`, **aditiva**):
  `amount_gross_cents`, `fee_cents`, e `amount_cents` = **líquido** (o que o caixa reflete).
  ⚠️ A coluna legada `amount_cents` foi **repurposed como líquido** (não renomeada) para manter
  `drizzle-kit generate` não-interativo — no domínio mapeia para `netCents`. Não recriar.
- **Append-only + ERRATA (regra central):** nunca editar/excluir transação. **Estornar** cria
  uma transação de tipo oposto com `reverses_transaction_id` → original; "estornada" é
  **derivado** (existe linha que a estorna), nunca campo mutável. **Corrigir** = estorno +
  relançamento (`correct-transaction.use-case`). Estornar duas vezes → 409
  (`TRANSACTION_ALREADY_REVERSED`); estornar um estorno → 422 (`TRANSACTION_NOT_REVERSIBLE`).
- **Saldos por AGREGAÇÃO on-read** (não snapshot): dois buckets — **dinheiro** (`cash`) e
  **digital** (`bank_transfer|credit_card|debit_card`); `credits` **fora** do caixa.
  `GET /balance` (SUM líquido com sinal) e `GET /balance/history` (running sum por dia em SQL).
- **Taxas de cartão** (`org_payment_fees`, UNIQUE org+método, RLS owner-write): líquido =
  `gross - round(gross*percent/100 + fixed_cents)`. Só em **entrada** (`income`) com cartão.
  Config **exclusiva de `owner`/`super_admin`** (checado em `upsert-payment-fees` via
  `IOrganizationRepository.isOwner`; `CASHIER_FORBIDDEN` 403). Helper puro
  `domain/fee-calculator.ts` (reusável pelo futuro módulo de Serviços).
- **Frontend**: valores sempre em **centavos** no estado (`lib/money.ts`); UI mobile-first
  (Table desktop + cards mobile), `Sheet` para novo lançamento/correção, `Dialog` para estorno,
  `DropdownMenu` portaled nas ações (oculto em linhas já estornadas/estorno). Config de taxas em
  `settings/cashier` (owner-only), dentro do `OrgSettingsLayout`.
- **Integração Serviço→transação:** entregue no módulo de Serviços (abaixo). A transação é
  criada **server-side via `TRANSACTION_REPOSITORY`** dentro do use-case — o gate owner-only do
  `CashierController` **não** bloqueia, pois RLS `transactions_insert = is_org_member`.

- **Categoria de sistema com identidade estável (2026-07-31)**: `is_protected` só
  bloqueia DELETE (regra do M5) — rename continua permitido em qualquer categoria,
  inclusive protegida. Quando código precisa achar uma categoria específica de forma
  confiável (ex.: marcar toda transação de reversão com a categoria "Estorno"), NÃO
  identificar por `name` (frágil a rename) — usar `transaction_categories.system_key`
  (nullable, único por org quando presente) como identidade interna estável. Padrão:
  `resolveReversalCategoryId` (`cashier/domain/reversal-category.ts`) resolve por
  `system_key='reversal'` via `findBySystemKey`, que é query DIRETA (sem passar pelo
  `TtlCache` de 1h de `findByOrg` — categoria resolvida da lista cacheada poderia nascer
  `null` numa reversão criada durante a janela de cache, e o caixa é append-only, sem
  como corrigir depois). Categoria de sistema ausente **nunca** lança exceção — degrada
  pra `categoryId: null` e o fluxo prossegue (a RLS de INSERT em `transaction_categories`
  exige `is_org_owner`, então o código de reversão, que também roda para funcionário via
  `CancelServiceUseCase`, nunca pode criar a categoria sob demanda). Aplicado nos 3
  pontos reais que criam transação de reversão: `ReverseTransactionUseCase`,
  `CancelServiceUseCase`, `CorrectServicePaymentUseCase` (só na reversão, nunca na
  transação de substituição) — `CorrectTransactionUseCase` delega pra
  `ReverseTransactionUseCase` e herda de graça.

### Comissão/repasse por profissional (2026-08-19, P-1)

- **Config por `(org_id, user_id)`, não por org**: `org_member_commissions` guarda
  percentual + modo (`gross`|`net`) POR PROFISSIONAL — diferente de `org_payment_fees`
  (uma config por método, para toda a org). Cada profissional pode ter seu próprio modo.
  Owner-write (`OrgOwnerGuard` no `PUT`), leitura escopada por ator: owner vê todos os
  membros, employee vê só a própria linha (`GetMemberCommissionsUseCase` via
  `resolveActor`, mesmo helper de `get-balance`/`list-transactions`).
- **Histórico imutável via `active`+`superseded_at`** (índice único parcial
  `(org_id, user_id) WHERE active`, mesmo padrão de `billing_plan_prices`/ADR-0024) —
  nunca `UPDATE` de `percent`/`mode` numa linha existente, só "desativar + inserir nova"
  (`supersede`, ordem obrigatória dentro de uma transação: desativar a linha antiga
  ANTES de inserir a nova, senão colide com o índice parcial). Um trigger de banco
  (`org_member_commissions_protect_immutable`) força essa imutabilidade
  incondicionalmente — nem super_admin escapa, porque não existe caminho legítimo de
  "corrigir" uma linha histórica.
- **Snapshot DESNORMALIZADO em `services`** (`commission_config_id` FK nullable, só
  auditoria, nunca lido para cálculo; `commission_percent`/`commission_mode`/
  `commission_base_cents`/`commission_cents` = fonte de verdade), gravado na MESMA
  escrita que `payment_transaction_id` (`RegisterPaymentUseCase`/`CreateServiceUseCase`
  quando o serviço já nasce pago). Sem config ativa, zera explicitamente (nunca pula a
  escrita) — é a única janela livre antes do primeiro pagamento; depois de pago, um
  trigger de banco (`services_protect_commission_columns`) só libera alterar essas 5
  colunas para o owner da org (o caminho de `CorrectServicePaymentUseCase`) ou role
  privilegiada, e bloqueia INSERT com comissão não-nula/não-zero vindo de não-owner.
- **Correção de pagamento preserva o snapshot ORIGINAL** (`percent`/`mode` do momento do
  pagamento inicial) — recalcula só `baseCents`/`commissionCents` sobre o novo valor
  corrigido. `CorrectServicePaymentUseCase` NÃO injeta `MEMBER_COMMISSION_REPOSITORY` de
  propósito: reconsultar a config vigente precificaria retroativamente um evento
  passado, o que a decisão de produto proíbe.
- **`UpdateServiceUseCase` bloqueia reatribuir `performedBy` de serviço já pago**
  (`ServicePerformerNotChangeableException`, 409) — comparando o valor RESOLVIDO (pós
  `resolvePerformer`), não o bruto do input, porque `resolvePerformer` mapeia
  `performedBy: null` enviado por um owner para `currentUserId`. Sem essa checagem, a
  comissão congelada com o percentual do profissional A passaria a ser exibida como
  comissão do profissional B nas agregações (que agrupam por `performed_by`).
- **Cálculo é função pura separada** (`commission-calculator.ts`, `computeCommission`) —
  NÃO reusa `computeNet`/`fee-calculator.ts`, que filtra por `FEE_ELIGIBLE_METHODS` (só
  cartão) e zeraria comissão de dinheiro/pix silenciosamente. Modo `gross` = base é o
  bruto (estúdio absorve 100% da taxa de cartão); modo `net` = base é o líquido pós-taxa
  (`netCents` já calculado por `computeNet` em outro lugar).
- **Agregação por período** (`commissionCentsByPeriod`) tem `performedBy: string | null`
  **obrigatório** (não opcional) de propósito — força todo caller a declarar o escopo
  explicitamente: `null` agrega a org inteira (só o ramo owner do overview usa), uma
  string escopa a um profissional (ramo employee). Um parâmetro opcional permitiria
  "esquecer" o escopo e vazar comissão de toda a org por omissão. Agregação ancorada em
  `performed_at` (mesma âncora de todas as outras métricas de serviço no overview), não
  na data do pagamento — um serviço executado num mês e pago no seguinte aparece na
  comissão do mês de execução, por consistência com o resto do relatório.
- **Débito conhecido, não bloqueante**: `resolveActor` (usado por `GetMemberCommissionsUseCase`
  e outros use-cases do cashier) resolve `isOwner` via role da membership LOCAL, não via
  `IOrganizationRepository.isOwner` — um super_admin agindo como owner de uma org da qual
  NÃO é membro recebe 403 ao LER comissões (`GET`), mas CONSEGUE escrever (`PUT`, que usa
  `orgRepo.isOwner` com fallback de `isSuperAdmin`). Falha fechada (sem vazamento), mas é
  assimetria a corrigir num follow-up que alinhe `resolve-actor.ts` ao ADR-0013.
- **Índice `services(org_id, performed_by, performed_at) WHERE canceled_at IS NULL`
  ausente** — as 4 agregações do módulo fazem seq scan; aceito como débito dado o volume
  baixo esperado (decisão de produto, não corrigir sem necessidade real).

### Serviços / Atendimentos (módulo `services`, 2026-06-21)

- **Serviço = evento central** (cliente + profissional + materiais + pagamento). Backend
  `modules/services/` (Clean Arch, espelha cashier/materials). Rota
  `orgs/:orgId/services` (`AuthGuard`+`OrgMembershipGuard` — **membros**, não owner-only).
  Schema `services`/`service_materials`/`service_types` já existia desde `0000` (RLS inclusa);
  migration `0014` só adicionou `services.canceled_at` (aditiva, hand-written).
- **Estado derivado (sem coluna de status):** `pendente` (sem `payment_transaction_id`, não
  cancelado) · `pago` (com transação) · `cancelado` (`canceled_at` set). ⚠️ Os getters do
  `ServiceEntity` (`status`/`isPaid`/`isCanceled`) **não serializam** em JSON — o frontend
  **deriva** status de `canceledAt` + `paymentTransactionId` (`serviceStatus()` em types).
- **Reaproveitamento entre módulos:** o use-case importa tokens já exportados pelos
  `*InfrastructureModule`: `TRANSACTION_REPOSITORY`+`computeNet`+`PAYMENT_FEE_REPOSITORY`
  (cashier), `MATERIAL_REPOSITORY`+`STOCK_MOVEMENT_REPOSITORY` (materials),
  `CUSTOMER_REPOSITORY` (customers), `MEMBER_REPOSITORY` (orgs). `services.module` importa os 4
  infra-modules. Atomicidade garantida pela transação por-request do `RlsInterceptor`.
- **`performed_by` / `created_by` = `users.id` (app), NÃO authId.** `user.id` no controller é o
  **authId** Supabase (guards comparam `users.auth_id = user.id`). Os use-cases resolvem a
  associação via `MEMBER_REPOSITORY.findByAuthId(orgId, authId)` (método **novo**) → `{ userId
(app), isOwner }`. `performed_by` casa com `member.userId` e com `calendar.assigned_to`.
- **Papéis:** funcionário (não-owner) **força `performedBy=self`** e vê/edita/paga/cancela só os
  próprios (`SERVICE_FORBIDDEN` 403); owner escolhe o profissional (membro ativo, senão
  `EMPLOYEE_INACTIVE` 422) e filtra por membro. Lista **default = mês vigente** (1º→hoje).
- **Pagamento:** `paymentStatus` "paid" → cria transação `income` **líquida** (`computeNet`) e
  vincula `payment_transaction_id`; "pending" → sem transação. `POST /:id/pay` converte
  pendente→pago (`SERVICE_NOT_PAYABLE` 409 se já pago/cancelado). Métodos: dinheiro,
  `bank_transfer` (Pix), crédito/débito — **`credits`/cashback adiados** (fora do enum do form).
- **Cancelar (`POST /:id/cancel`):** marca `canceled_at` + **estorna** a transação (errata,
  `reversesTransactionId`) + **devolve estoque** (movimento `manual_adjustment` positivo).
  Recancelar → `SERVICE_ALREADY_CANCELED` 409. **Editar** (`PATCH /:id`) só campos
  não-financeiros (tipo/cliente/profissional/local/descrição/data); materiais = cancelar + recriar.
- **Corrigir valor de pagamento** (`PATCH /:id/payment`, owner-only, `CorrectServicePaymentUseCase`,
  2026-07-17): estorna a transação de pagamento original e relança uma nova com o valor/método
  corrigidos (fee/net recalculados via `computeNet` no NOVO método) — só então atualiza
  `services.amount_cents`/`payment_method`/`payment_transaction_id`, nessa ordem exata (nunca deixa
  o serviço apontando para uma transação já estornada). **Autoria**: o estorno usa o ator que
  corrige (`createdBy: currentUserId`); o relançamento preserva o autor original
  (`createdBy: original.createdBy`) — mesmo padrão do `CorrectTransactionUseCase` do cashier.
  Serviço cancelado/pendente/já-estornado → `SERVICE_PAYMENT_NOT_CORRECTABLE` 422.
  **Guarda simétrica no cashier**: `CorrectTransactionUseCase` e `ReverseTransactionUseCase`
  (ambos em `cashier`) rejeitam (422 `TRANSACTION_IS_SERVICE_PAYMENT`) corrigir/estornar pelo
  caminho genérico do Caixa uma transação vinculada a um serviço — `CashierModule` importa
  `ServicesInfrastructureModule` só para isso (sem ciclo: essa infra-module só depende de
  `DatabaseModule`). Ver ADR a considerar / `.memory/sessions/` para o raciocínio completo.
- **Consumo de materiais:** linha não-compartilhável → quantidade (valida estoque, senão
  `INSUFFICIENT_STOCK` 422; debita via `updateStockQuantity` + movimento `service_consumption`
  - `touchLastUsed`). Compartilhável (`shareable`) → checkbox **"acabou?"**: marcado ⇒ baixa
    **1 unidade** + grava `service_materials.quantity=1`; desmarcado ⇒ não baixa / sem linha.
- **Cliente** precisa estar `enabled` (senão `CUSTOMER_DISABLED` 422).
- **Tipos de serviço criáveis inline** (`POST /services/types`, upsert UNIQUE org+name — espelha
  transaction-category). ⚠️ Rotas `/types` declaradas **antes** de `/:id` no controller (senão
  `:id` captura "types").
- **Frontend** `features/services/`: Sheet com 3 seções (Dados·Materiais·Pagamento), `useFieldArray`
  - `useFormContext` em `material-lines` (mutar o snapshot do field **não** atualiza o RHF — usar
    `register`/`Controller`); lista Table desktop + cards mobile com badge de status; reusa
    `lib/money` do cashier e `useCustomers`/`useMembers`/`useMaterials`.

### Estoque — modelo realista (reunião 11/06)

- Objetivo: o registrado deve refletir o **físico**
- **Descartáveis (consumo unitário)** — cartuchos, agulhas, luvas, barreiras → usou, saiu do estoque
- **Parcialmente consumidos** — vaselina, sabão, limpeza → controlar frações é burocrático; decisão tentativa: após o **primeiro uso**, tratar como **consumido**
- **Integração estoque ↔ serviço** (futuro, pesquisar): relacionar materiais ao serviço para custo real/lucro líquido (`service_materials` já existe no schema)

#### Simplificações implementadas (2026-06-15)

- **Material NÃO tem mais campo `unit`** (removido — migration `0006`). Não reintroduzir.
- **`shareable` (bool, migration `0005`)**: material compartilhável não é "queimado" por inteiro a cada serviço (ex.: luvas). UI = `Switch` no form + badge "Compartilhável" na lista. ⚠️ O comportamento de consumo (ao vincular no serviço, perguntar se acabou → descontar) é **pendente** e será feito com o módulo de Serviços — hoje só existe a flag.
- **Ajuste de estoque**: o form separa **direção** (`Select` Adição/Remoção) + **quantidade** (input só-número); o `quantityDelta` com sinal é montado na submissão (`stock-page handleAdjust`). Backend continua recebendo `quantityDelta` assinado.
- **Excluir material**: bloqueado se vinculado a algum serviço — `DeleteMaterialUseCase` checa `service_materials` e lança `MATERIAL_IN_USE_BY_SERVICES` (409). Frontend mostra a mensagem no `handleDelete`.

### Agenda — implementada (2026-06-15)

- **Agenda por membro**: cada membro gerencia a **própria** agenda. `calendar_events.assigned_to` (FK `users.id`, NOT NULL) é o dono do horário. `owner` pode **criar** evento em nome de um membro (`assignedTo` no create, só na criação); **editar/excluir de terceiro continua bloqueado** mesmo para owner (`CALENDAR_EVENT_FORBIDDEN`, 403) — corrigido 2026-07-17, a nota anterior ("ninguém cria evento de outro, nem owner") estava desatualizada frente ao código.
- **Tipo de evento** (`calendar_event_type`, migration `0007`): `appointment` (com `customer_id` opcional) | `unavailability` (bloqueio).
- **Sobreposição** proibida por membro: app-level em `CreateCalendarEventUseCase`/`UpdateCalendarEventUseCase` (`hasOverlap`) → `CALENDAR_EVENT_OVERLAP` (409). `ends_at > starts_at` → `CALENDAR_EVENT_INVALID_RANGE` (422). Editar/excluir de terceiro → `CALENDAR_EVENT_FORBIDDEN` (403).
- **Visibilidade por papel**: `owner` = admin (vê todos; filtra por membro via `?assignedTo=<userId>`); `employee` vê só os seus (o use-case força `assignedTo = self`). No frontend, owner que abre evento de outro membro vê em **modo leitura** (`EventForm readOnly`).
- **Backend**: `modules/calendar/**` (espelha customers); rota `orgs/:orgId/calendar` (`AuthGuard`+`OrgMembershipGuard`). RLS de `calendar_events` já vinha de `0000` (isolamento por org); a visibilidade por membro é camada de aplicação.
- **Frontend**: `features/agenda/**` — context (view day/week/month + range), `useCalendarEvents`, visões **custom em CSS-grid** (Semana/Mês/Dia, sem lib de calendário), `EventForm` (Sheet). Página `[orgSlug]/schedule.tsx`.
- **Integração externa (Google/Outlook/Apple)**: **adiada** — só placeholder em `/dashboard/preferences` ("Calendários externos — em breve"). Conexão será **por usuário** (espelhamento bidirecional), nunca em nome de outro. Não bloqueia o fluxo nativo.
- **Status do evento** (migration `0008`): `scheduled | canceled` (mínimo). Só o dono altera (`UpdateCalendarEventUseCase`). Eventos `canceled` aparecem esmaecidos/riscados nas visões. Marcar status NÃO cria serviço/transação (virá com Serviços/Caixa).

### F6 — Eventos compartilhados + RSVP (M6, 2026-07-17)

- **Visibilidade do evento** (`calendar_events.visibility` enum `private|shared`, migration `0026`, **default `private` NOT NULL**): evento `private` (padrão) só é visível para o dono + owner/admin; `shared` fica visível para **toda a organização** + ganha lista de presença. Toggle "Compartilhar com a equipe" no `EventForm`, só o dono edita (mesma regra de edição do evento).
- **Backfill seguro**: `ADD COLUMN ... DEFAULT 'private' NOT NULL` sem nenhum `UPDATE` — todo evento pré-existente permanece `private`. Verificado com `database-guardian` + reviewer antes do merge (nenhum evento antigo vaza para a org).
- **RLS não distingue private/shared**: a policy Postgres de `calendar_events`/`calendar_event_attendees` só isola por **tenant** (`is_org_member(org_id)`) — mesmo padrão de `service_materials` (tabela filha sem `org_id` direto, policy via `EXISTS` join). O filtro private/shared é **100% camada de aplicação**: `ListCalendarEventsUseCase` — `owner` vê tudo (ou filtra por `assignedTo`); `employee` **ignora** o `assignedTo` do input e busca `assignedTo = self OR visibility = 'shared'` (nunca vê `private` de terceiro).
- **RSVP** (`calendar_event_attendees`: `event_id`+`user_id` FK cascade, unique `(event_id,user_id)`, `status` enum `going|not_going`): `SetEventRsvpUseCase` deriva `user_id` **sempre do membership da sessão** (nunca do body/client) e só aceita RSVP em evento `shared` (senão `CALENDAR_EVENT_NOT_SHARED`, 422). `pending` é **derivado, nunca persistido** — `ListEventAttendeesUseCase` monta o roster com todos os membros ativos da org, marcando `pending` quem não tem linha de attendee.
- **Frontend gotcha**: `<EventAttendees>` (botões Vou/Não vou) fica **fora** do `<fieldset disabled={readOnly}>` do `EventForm` — funcionário abre evento `shared` de outro membro em modo leitura (não edita o evento), mas precisa conseguir votar a própria presença.
- **Valor da sessão continua na descrição** — F6 não adicionou campo novo para isso.
- **Migration manual**: `drizzle-kit generate` segue quebrado desde a `0011` (sem snapshot) — `0026` escrita à mão seguindo o padrão de `0025_transaction_categories_protected.sql` (+ `.down.sql` + entrada manual em `meta/_journal.json`).

### F4/F7/F8 — Regras e mídia de serviços (M7, 2026-07-17)

- **F4 — flag 18+ por tipo de serviço** (`service_types.requires_age_verification` boolean, migration `0027`, default `false`): decisão de produto confirmada pelo usuário é **BLOQUEIO**, não alerta. `assertAgeVerification` (helper isolado) calcula idade real por mês/dia (não só subtração de ano) na data efetiva do atendimento (`performedAt`); se o tipo exige e o cliente é menor, OU não há cliente selecionado, OU o cliente não tem `birthDate` válido → `ServiceAgeVerificationRequiredException` (422 `SERVICE_AGE_VERIFICATION_REQUIRED`). **Default seguro**: sem dado para confirmar maioridade = bloqueia. `update-service.use-case.ts` valida sobre os **valores efetivos pós-merge** (existing ⊕ patch) — trocar só o cliente para um menor, sem reenviar `serviceTypeId`, ainda bloqueia.
- **Gerenciar a flag é owner-only**: `POST orgs/:orgId/services/types` (criação inline por qualquer membro, sem guard) **não aceita** `requiresAgeVerification` — só `PATCH orgs/:orgId/services/types/:typeId` (`OrgOwnerGuard`) pode habilitá-la, por ser regra de negócio/responsabilidade legal sensível.
- **F7 — nome amigável preservado no download**: já existia ~90% em `customer-attachments` (path interno único `{orgId}/{customerId}/{uuid}_{safeName}`, `fileName` original preservado no registro). Gap fechado nesta sessão: `IStorageProvider.createSignedUrl` ganhou 4º parâmetro opcional `downloadFileName?` — quando passado, força `Content-Disposition: attachment; filename="..."` via Supabase Storage (`{ download: ... }`). Só `ListCustomerAttachmentsUseCase` passa isso; `ListServiceMediaUseCase` (F8) **não passa** de propósito (fotos exibidas inline, não forçadas a download).
- **F8 — fotos do serviço** (`service_media`, migration `0027`, bucket privado `service-media`, 300KB/img, `image/png|jpeg|webp`): réplica exata do padrão `customer_attachments`, com `org_id` **denormalizado** na tabela (RLS direta `is_org_member(org_id)`, sem join — diferente do padrão de `calendar_event_attendees`/`service_materials`, que não tem `org_id` próprio). Limite de 3 imagens por serviço checado em app (`countByService` antes do insert, `SERVICE_MEDIA_LIMIT_EXCEEDED` 422) — sem constraint de banco (TOCTOU aceito nesta escala).
- **Gotcha de migration/Storage**: `DELETE FROM storage.buckets`/`storage.objects` direto via SQL **falha** no Supabase local ("Direct deletion from storage tables is not allowed"). `.down.sql` de migration que cria bucket **não deve** tentar apagá-lo — deixar o bucket órfão após rollback é seguro (o `up` é idempotente via `ON CONFLICT DO UPDATE`). Bug idêntico (não corrigido, tarefa em backlog) existe nas migrations `0010` e `0012`, nunca exercitado antes desta sessão.
- **Migration manual**: mesma situação da `0026` — `0027` escrita à mão (drizzle-kit generate quebrado desde `0011`).

### M8 — Exportação de dados (A5, 2026-07-17)

- **Formato configurável**: os 4 endpoints de export existentes (services, cashier,
  customers, materials — RPT-2, 2026-06-27) ganharam query params opcionais `format`
  (`'csv'|'xlsx'`, default `'csv'`) e `delimiter` (`'comma'|'semicolon'|'tab'`, só
  relevante quando `format=csv`, default `'comma'`). **Retrocompatível**: nenhum
  parâmetro novo = comportamento idêntico ao anterior (CSV com vírgula).
  Normalização de valores inválidos/ausentes cai sempre no default — nunca lança erro por
  `format`/`delimiter` desconhecido.
- **`common/csv/csv.util.ts`**: `buildCsv()` ganhou 4º parâmetro opcional
  `delimiterChar` (`,`/`;`/`\t`); `csvCell()` escapa o delimitador ativo além do escape
  fixo já existente (`/[",\n;]/`) — superset estrito do comportamento anterior. Nova
  `resolveColumns()` extraída (seleção/ordem via `fields`) para ser reusada tanto por
  `buildCsv` quanto pela nova geração de Excel.
- **`common/csv/xlsx.util.ts`** (novo): `buildXlsx<T>(rows, columns, fields?): Promise<Buffer>`
  via **`exceljs`** — reusa a mesma `CsvColumn<T>[]`/`resolveColumns()` do CSV, escreve
  valores com tipo nativo do Excel (number/Date/string conforme o que
  `column.value(row)` já retorna), freeze da primeira linha, largura de coluna
  automática. **Decisão de lib**: `exceljs`, não `xlsx`/SheetJS — o pacote `xlsx`
  publicado no npm tem vulnerabilidade conhecida (prototype pollution/ReDoS) sem correção
  no próprio registro (só corrigida no CDN deles, fora do fluxo normal de instalação).
- **Content-Type/Content-Disposition por formato**: CSV mantém `text/csv; charset=utf-8`
  - `.csv`; Excel usa
    `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + `.xlsx`.
    `res.send()` aceita tanto `string` (CSV) quanto `Buffer` (Excel) sem tratamento
    especial.
- **Frontend**: `export-menu.tsx` (componente único reusado pelas 4 páginas) ganhou
  `Select` de Formato (CSV/Excel) + `Select` de Delimitador (só visível quando CSV,
  espelhando o padrão de campo condicional já usado no projeto). Textos renomeados:
  "Exportar CSV" → "Exportar dados"; "Baixar CSV" → dinâmico conforme o formato
  ("Baixar CSV"/"Baixar Excel"). `download-csv.ts` renomeado para `download-export.ts`
  (função `downloadExport`), extensão do arquivo baixado derivada do formato escolhido.

### M9 — Tour de onboarding (F9, 2026-07-17)

- **Persistência no backend, não localStorage**: `users.onboarding_completed_at`
  (timestamptz nullable, migration `0028`, SEM backfill — usuários existentes veem o
  tour uma vez, é dismissível e barato). Decisão do usuário: correta entre
  dispositivos/navegadores, mesmo elevando a tarefa de "intermediária" (rótulo original
  do roadmap) para **complexa + database-guardian** por tocar schema.
- **Timestamp sempre derivado no servidor**: `PATCH /auth/me` aceita
  `onboardingCompletedAt` só como **sinal** (qualquer string truthy ou `null`) — o valor
  em si é sempre `new Date()` no momento da chamada, nunca o timestamp enviado pelo
  cliente (evita gravar uma data arbitrária de passado/futuro na própria linha).
- **Sem endpoint novo**: reusa o fluxo já existente `PATCH /auth/me` →
  `UpdateMeUseCase` → `userRepo.update` (mesma auditoria automática via
  `changedFields`), em vez de criar uma rota dedicada.
- **Lib de tour**: `driver.js` (vanilla JS, zero peer-deps — sem risco de conflito com
  React 19). CSS global só pode ser importado em `pages/_app.tsx` (Next pages router);
  importar em componente/hook quebra o build.
- **Passos calculados dinamicamente**: `getTourSteps(org)` (função pura,
  `features/dashboard/lib/onboarding-tour.ts`) reusa EXATAMENTE o mesmo filtro de
  visibilidade de `org-sidebar.tsx` (role + `canAccessModule`) — funcionário com
  permissões parciais vê só os passos dos módulos que realmente acessa; owner vê todos.
- **Replay via query param, não navegação direta durante o tour**: botão "Ver tour
  novamente" fica em **Minha Conta** (não em Configurações da org — o tour é por
  usuário, não por org) e navega para `/dashboard/org/<slug>/overview?tour=1`;
  `useOnboardingTour` (montado em `OrgLayout`) detecta `?tour=1` e inicia em modo
  replay (sem regravar a flag). O tour em si NUNCA navega durante a execução dos
  passos — só alterna o drawer mobile e o destaque entre elementos já montados.
- **Gotcha de React Strict Mode**: o guard de dupla montagem (`startedRef`) só é
  setado **dentro** do `setTimeout` de start, nunca antes de agendá-lo — senão o
  cleanup do Strict Mode cancela a 1ª montagem e a 2ª nunca reagenda (tour morto).
- **Mobile**: `onHighlightStarted` do driver.js abre o drawer antes de destacar item de
  sidebar (`data-tour="nav-*"`) e fecha para os demais passos (popover central,
  `user-menu`) — evita o overlay do drawer cobrindo o header por cima do popover.

### M10a — Ficha de anamnese: construtor + versionamento (F10, 2026-07-17)

- **F10 dividido em 3 fatias** (decisão do usuário, após pesquisa mostrar que
  "complexa" no roadmap subestimava o escopo real): **M10a** (este) = construtor +
  versionamento, admin-only, sem exposição pública. **M10b** (próximo) = link público
  sem login + submissão de resposta (primeiro endpoint de escrita pública do app) +
  e-mail + `services.anamnesis_response_id`. **M10c** (BLOQUEADO) = assinatura digital —
  usuário precisa pesquisar validade jurídica (ICP-Brasil ou equivalente) antes de
  qualquer código; não implementar sem confirmar que a pesquisa foi feita.
- **Modelagem em 2 tabelas** (migration `0029`): `anamnesis_forms` (identidade — 1 por
  tipo de serviço via `UNIQUE(service_type_id)`) + `anamnesis_form_versions` (conteúdo
  — snapshot imutável das perguntas em `jsonb`, `UNIQUE(form_id, version_number)`,
  `org_id` denormalizado pra RLS, mesmo padrão de `service_media`). Separar identidade
  de conteúdo versionado é o que permite "1 formulário, N versões" sem ambiguidade.
- **Imutabilidade de versão é estrutural, não só de convenção**: RLS de
  `anamnesis_form_versions` não tem policy de UPDATE nem DELETE — nem `is_super_admin()`
  consegue mudar uma versão existente pela conexão `DRIZZLE` (só `DRIZZLE_ADMIN`/dono da
  tabela poderia, fora do caminho normal da app). O repositório também não expõe nenhum
  método de update/delete de versão — toda gravação é `createVersion()` (get-or-create
  do form + `INSERT` da próxima versão numa transação; `version_number` = `max()+1`).
- **Só owner cria/edita** (`POST .../versions` com `OrgOwnerGuard` + RLS
  `is_org_owner(org_id)`); qualquer membro lê (`GET` com `OrgMembershipGuard` + RLS
  `is_org_member(org_id)`) — precisa saber se o tipo de serviço exige anamnese.
  `createdBy` sempre resolvido de `authId` (sessão) → `users.id`, nunca aceito do
  client/body.
- **Perguntas sem schema no banco** (`jsonb` puro: `{ id: uuid, type: 'text'|'yes_no',
label, required }[]`) — a única validação é em aplicação (`class-validator` nested no
  DTO, `whitelist: true` no `ValidationPipe` global remove chaves extras antes de
  chegar no jsonb). Sem verificação de unicidade de `question.id` dentro do array ainda
  — pendência registrada pra M10b resolver antes de mapear respostas por pergunta.
- **Pendência explícita levada pro M10b** (achado do `database-guardian`):
  `anamnesis_forms.service_type_id` é `ON DELETE CASCADE` — hoje inofensivo (M10a não
  tem nenhuma resposta preenchida), mas quando M10b existir (`services` →
  `anamnesis_responses` → `anamnesis_form_versions`), excluir um tipo de serviço vai
  apagar em cascata todo o histórico de versões e, por extensão, o registro de
  respostas preenchidas por clientes — decidir lá se isso é aceitável ou se o FK
  precisa virar `RESTRICT`/a resposta precisa ficar self-contained (snapshot das
  perguntas embutido na resposta, não só uma referência).
- **Sem tela de gestão de tipos de serviço** existia antes desta fatia (tipos só eram
  criados inline por nome ao lançar serviço) — criada uma página mínima
  `settings/anamnesis` (owner-only) que lista os tipos existentes e permite configurar
  a ficha de cada um; NÃO é CRUD completo de tipos (fora de escopo).

### M10b — Ficha de anamnese: link público sem login + submissão (F10, 2026-07-17)

- **Gatilho do envio é ação manual do owner/funcionário** (decisão do usuário) — NÃO
  automático via `calendar_events` (sem `serviceTypeId` pra resolver o form) nem via
  `service` (só criado depois do atendimento, tarde demais pra ficha de saúde). Botão
  "Enviar ficha de anamnese" cria uma resposta `pending` (token + snapshot da versão
  vigente) e dispara e-mail; quando o `service` financeiro é lançado depois, ele pode
  referenciar manualmente uma resposta já `submitted` do mesmo cliente/tipo. Módulo
  `calendar` não foi tocado nesta fatia.
- **`anamnesis_responses` é autocontida por design** (migration `0030`): copia
  `questionsSnapshot` da versão vigente NO MOMENTO DO ENVIO, nunca lida de
  `anamnesis_form_versions` depois. Isso resolve a pendência que M10a deixou pro
  `database-guardian`: `anamnesis_forms.service_type_id` continua `ON DELETE CASCADE`
  com segurança, porque excluir o tipo/form/versões não afeta respostas já enviadas —
  `formVersionId` na resposta é só proveniência (`ON DELETE SET NULL`).
- **Primeiro endpoint de escrita público do app** (`public/anamnesis-responses/:token` +
  `:token/submit`, sem `AuthGuard`): repositório usa `DRIZZLE_ADMIN` (bypassa RLS) SÓ em
  `findByToken`/`markSubmitted`/`delete`/`deletePendingFor` — o resto do módulo
  (`create`/`findById`/`findLinkable`) usa `DRIZZLE` normal com `organization_id` da
  sessão. RLS da tabela habilitada mas SEM policy de UPDATE/DELETE (dado de saúde é
  append-only por convenção; a única mutação pós-insert, `markSubmitted`, roda sempre
  via admin porque quem submete não tem sessão).
- **Minimização de PII no GET público**: retorna só `questions`, primeiro nome do
  cliente (`customerName.split(" ")[0]`), `status` derivado e `expiresAt` — nunca nome
  da org, ids internos, outros dados do cliente ou as `answers`. `@Throttle` mais
  restrito no submit (5/60s vs. 120/min global) — token é 256 bits (`gen_random_bytes(32)`
  hex), enumeração inviável mesmo sem o throttle mais apertado.
- **Vínculo `services.anamnesis_response_id`** (índice único parcial `WHERE
anamnesis_response_id IS NOT NULL`): `assertAnamnesisResponseLinkable` faz o
  pré-check de aplicação (existe na org, `status=submitted`, cliente/tipo batem
  quando a resposta já os tem preenchidos), mas a violação do índice único
  (resposta já vinculada a OUTRO service) é responsabilidade exclusiva do catch de
  unicidade no repositório — não há pré-check de aplicação pra esse caso específico.
- **Gotcha real, achado só em teste manual (não pelo `reviewer` estático)**:
  `drizzle-orm@0.45.2` envolve o erro do pg num `DrizzleQueryError` — o `code` real da
  violação (`23505`) fica em `error.cause.code`, não em `error.code`. O padrão
  `isUniqueViolation(error)` que só checava `error.code` (copiado de
  `drizzle-customer.repository.ts`) **não pegava mais a violação** e deixava vazar um
  500 cru em vez do 409 de domínio — silenciosamente "funcionava" pro caso de cliente
  porque `create-customer.use-case.ts` tem um pré-check de aplicação que intercepta
  antes do insert; pro caso de anamnese não há esse pré-check (documentado no próprio
  código), então o bug era 100% visível. Corrigido em
  `drizzle-service.repository.ts` (`isUniqueViolation` agora também verifica
  `error.cause?.code`). **O mesmo bug ainda existe em `drizzle-customer.repository.ts`**
  (mascarado, não corrigido nesta fatia — spinned off como task separada). Qualquer
  repositório novo que capture `23505` via `catch` deve usar esse padrão corrigido, não
  copiar o antigo.
- Achados `low` do `reviewer` aceitos sem ação: sem `@MaxLength` por campo em
  `AnamnesisAnswerDto.value` (bounded pelo limite padrão do body-parser, ~100kb); e-mail
  do cliente em log de erro (PII leve, consistente com o resto do código);
  `SendAnamnesisInviteUseCase` não compensa (não deleta a resposta pendente) quando o
  canal de e-mail está desabilitado/no-op (`sendAnamnesisLink` retorna `false` sem
  lançar) — só relevante se um canal mal configurado em produção retornar `false` em
  vez de lançar.

### M10c — Ficha de anamnese: assinatura eletrônica (F10, parte 3/3, final, 2026-07-17)

- **Pesquisa jurídica concluída antes de codar** (bloqueio explícito desde M10, decisão
  do usuário): assinatura eletrônica SIMPLES (não ICP-Brasil) é válida no Brasil pra
  este termo de consentimento — jurisprudência STJ 2024-2026 (REsp 2.197.156, STJ
  03/12/2024, TJSP Ap. 1011554-80.2024.8.26.0451) valida assinatura em plataforma
  própria/não certificada quando integridade é demonstrável. gov.br Assinador é
  inviável (API restrita a órgãos públicos). Optou-se por implementação própria (DIY)
  em vez de ClickSign/DocuSign: mesmo nível jurídico, custo zero, sem dependência
  externa nova. **Isso é pesquisa registrada, não parecer jurídico formal.**
- **Novas dependências**: `pdfkit` (+ `@types/pdfkit`, backend) pra geração de PDF
  server-side sem DOM/browser; `signature_pad` (frontend) pro canvas de assinatura —
  nenhuma tinha precedente no projeto antes desta fatia.
- **Evidências gravadas na submissão** (migration `0032`, colunas nullable em
  `anamnesis_responses`): `signer_full_name`, `signer_cpf` (opcional, só regex de 11
  dígitos, sem checagem de dígito verificador), `signature_storage_path`,
  `pdf_storage_path`, `pdf_hash_sha256`, `request_ip`, `request_user_agent`. Bucket
  privado novo `anamnesis-documents` (1MB, `image/png`+`application/pdf`), mesmo padrão
  de `service_media` (0027) — path com signed URL, nunca público.
- **Caminho de storage inclui nonce por tentativa** (`{orgId}/{responseId}/{randomUUID}-signature.png`
  e `...-signed-form.pdf`, não um path fixo por `responseId`): decisão pós-`reviewer`.
  Path fixo + `upsert:true` permitia que duas submissões concorrentes do mesmo token
  (double-tap, replay de rede) sobrescrevessem os artefatos uma da outra no Storage de
  forma independente de qual `markSubmitted` vencesse a corrida no Postgres — o hash
  gravado no banco podia não bater com o arquivo fisicamente armazenado. Com paths
  únicos por tentativa, cada chamada só referencia os próprios arquivos; a tentativa
  perdedora fica com blobs órfãos (inofensivos, nunca lidos) em vez de corromper a
  integridade da vencedora. **`IStorageProvider.uploadFile` não tem mais parâmetro
  `upsert`** (foi adicionado e depois revertido nesta mesma fatia — ver histórico do
  PR — porque deixou de ser necessário uma vez que os paths são únicos).
- **`markSubmitted` retorna `boolean`** (linhas afetadas > 0), não mais `void`: o
  `WHERE status='pending'` já existia desde M10b como proteção contra dupla submissão,
  mas o use-case não checava o resultado — uma submissão concorrente perdedora
  reportava sucesso (200) mesmo sem ter sido persistida. Agora, 0 linhas afetadas ⇒
  `AnamnesisResponseAlreadySubmittedException` (409), e o e-mail best-effort não é
  disparado pra essa tentativa. Achado do `reviewer` (severidade high) só descoberto em
  teste manual com duas requisições concorrentes de verdade — revisão estática de
  código não pega essa classe de bug.
- **Sem commit parcial**: ordem estrita no use-case — validar respostas → validar
  magic-number PNG da assinatura (`0x89 0x50 0x4E 0x47`) → gerar PDF (falha aqui também
  vira `AnamnesisSignatureRequiredException`, não 500 cru) → hash SHA-256 do PDF →
  upload de assinatura+PDF → `markSubmitted` (só aqui a linha muda de estado) → e-mail
  de cópia best-effort por último, nunca antes.
- **E-mail de cópia é best-effort, NUNCA reverte a submissão** — diferente do padrão de
  `send-anamnesis-invite.use-case.ts` (que reverte/compensa em falha de e-mail): aqui a
  evidência (hash+storage+DB) já está durável antes da tentativa de e-mail, então uma
  falha de envio só é logada (com `response.id`, nunca o e-mail do cliente em texto —
  PII em log). `customerEmail` é carregado por `findByToken` mas NUNCA exposto pelo
  DTO do GET público (`GetAnamnesisResponseByTokenUseCase`) — só usado internamente
  pelo `submit`.
- **`signatureImageBase64`**: data URI `data:image/png;base64,...`, `@MaxLength(80_000)`
  no DTO. Canvas do frontend limita `devicePixelRatio` a no máximo 2x (não o valor real
  do dispositivo, que pode chegar a 3-4x em celulares) — sem esse teto, uma assinatura
  densa em tela HiDPI podia gerar um PNG grande o bastante pra flertar com o limite.
- **Hash do formulário vs. hash do PDF**: o PDF gerado imprime um "Hash do formulário"
  (SHA-256 do `questionsSnapshot` serializado com chaves em ordem fixa — prova QUAL
  conjunto de perguntas foi assinado). O hash do PRÓPRIO PDF (`pdf_hash_sha256`,
  gravado no banco, não impresso no documento — seria autorreferente) é a prova de
  integridade do arquivo de evidência.
- **CPF em texto puro, sem criptografia adicional** — sinalizado pelo
  `database-guardian` como decisão de produto (LGPD: CPF é PII, legível por qualquer
  membro da org via RLS `is_org_member`), não bloqueante. Não resolvido nesta fatia.
- **F10 está completo**: M10a (construtor+versionamento) + M10b (link público+submissão)
  - M10c (assinatura) cobrem o fluxo inteiro de ficha de anamnese.

### M10d — Gate de versão vigente, reenvio inteligente e envio de cópia por e-mail (2026-08-22/23)

- **Gate de já-respondida é escopado por VERSÃO VIGENTE, não por vínculo com serviço.**
  `SendAnamnesisInviteUseCase` chama `findSubmittedForVersion(customerId, formVersionId,
  orgId)` — **diferente** de `findLinkable` (que exclui respostas já vinculadas a um
  `service` via `notExists`). Uma resposta `submitted` já vinculada a um serviço CONTINUA
  contando como "já respondida" para este gate: publicar uma nova versão do formulário é o
  único jeito de reabrir o envio (coerente com ADR-0020). A checagem roda ANTES de qualquer
  lookup de convite pendente — um cliente com `submitted` da versão vigente E um pendente
  órfão qualquer sempre recebe 409 (`ANAMNESIS_ALREADY_ANSWERED_CURRENT_VERSION`), nunca cai
  no caminho de reenvio.
- **Reenvio REUTILIZA o convite pendente existente** (mesmo token/link) em vez do padrão
  anterior de sempre `deletePendingFor` + criar — só quando `!pending.isExpired` E
  `pending.formVersionId === version.id` (versão antiga não reutiliza: `questionsSnapshot`
  é congelado na criação, reusar reenviaria formulário desatualizado). **Decisão de produto
  confirmada**: o reenvio NÃO estende `expiresAt` — um convite reenviado perto do vencimento
  continua expirando no prazo original. Flag `createdNew` controla a compensação de falha de
  e-mail: hoje só decide a `audit_action` (`anamnesis_invite_sent` vs.
  `anamnesis_invite_resent`) e a mensagem de log — não há mais compensação explícita
  (`delete`) no catch; a resposta recém-criada é desfeita pelo `ROLLBACK` automático da
  transação do request quando a exceção de falha de e-mail é lançada (ver débito (a),
  resolvido, abaixo). Audit action `anamnesis_invite_sent` (criação) vs.
  `anamnesis_invite_resent` (reuso) — ambos valores de `audit_action` adicionados na
  migration `0055_audit_action_anamnesis_resend_copy` (renumerada de 0054 no meio do
  trabalho por colisão com `0054_billing_plans_presentation_fields`, que chegou de um merge
  concorrente — checar sempre `db:status` antes de assumir o próximo número livre quando
  há trabalho em paralelo).
- **`findSubmittedForVersion`/`findPendingFor` usam `this.db` (DRIZZLE normal, RLS válido
  via sessão), não `this.admin`** — ao contrário dos métodos vizinhos do mesmo repositório
  (`deletePendingFor`, `findByToken`, `markSubmitted`, `linkCustomer`) que usam admin por
  motivos próprios (fluxo público sem sessão, ou policy sem UPDATE/DELETE). Não copiar
  `this.admin` "porque os vizinhos usam" — cada método do repositório escolhe a conexão pela
  própria necessidade de RLS, não por convenção do arquivo.
- **Envio de cópia por e-mail (`SendAnamnesisResponseCopyUseCase`, endpoint `POST
  /orgs/:orgId/anamnesis-responses/:id/send-copy`) NUNCA regenera o PDF** — sempre a mesma
  signed URL do artefato já gerado no submit (`pdf_storage_path`), TTL 604800s (7 dias),
  mesmo valor usado em `submit-anamnesis-response.use-case.ts` (paridade deliberada, não
  reduzir só neste ponto sem reduzir os dois juntos). **Decisão de produto confirmada**: o
  e-mail vai sempre para o endereço JÁ CADASTRADO do cliente (`customer.email`), nunca um
  destinatário digitado na hora — evita vazar PII de saúde para endereço não verificado. O
  download autenticado pelo profissional (botão "Abrir PDF" no viewer) já cobria o caso
  "quero consultar agora"; este endpoint cobre "quero que o CLIENTE receba".
- **"Notificar quem solicitou" (requisito de produto) foi resolvido como erro 409 síncrono**,
  não notificação in-app persistida — decisão confirmada com o usuário. O envio de convite
  só tem um chamador (ação manual na tela), então o 409 já é o aviso; se surgir um remetente
  assíncrono no futuro (cron, fila), aí sim vale integrar `NotificationService` (exigiria
  migration no enum `notification_type`, hoje não usado no módulo `anamnesis`).
- **GOTCHA de PII em log**: nunca interpolar `customer.email` em mensagens de log de falha
  de envio — só `response.id`/`customerId`. Mesma regra já valia para `submit-anamnesis-response.use-case.ts`
  (seção M10c acima); replicada aqui em `send-anamnesis-invite.use-case.ts` e
  `send-anamnesis-response-copy.use-case.ts`.
- **Débitos conhecidos, não bloqueantes** (aceitos nesta fatia, achados por
  `database-guardian`/`reviewer`; itens (a)-(c) resolvidos em 2026-08-23): (b) resolvido —
  índice `anamnesis_responses_org_customer_status_idx` em
  `(org_id, customer_id, status)` criado na migration
  `0056_anamnesis_responses_org_customer_status_idx`; (d) sem unique index parcial
  `WHERE status='pending'` em `(org_id, customer_id, service_type_id)` — duas requisições de
  reenvio simultâneas ainda podem, em tese, criar 2 pendentes (pré-existente, janela só
  diminuiu com esta fatia; decisão de produto/prioridade, não resolvida nesta rodada).

### Conformidade legal — LGPD Tier 1 (2026-07-27, ADR-0018)

- **Divisão controlador/operador**: para conta/billing/telemetria de usuário da plataforma,
  o **ASO é controlador**; para dados de clientes/pacientes do estúdio (customers, anamnese,
  anexos), o **estúdio (organization) é controlador** e o ASO atua só como **operador**.
  Formalizado em `apps/frontend/src/features/legal/` (4 páginas: termos, privacidade,
  cookies, adendo de tratamento de dados) e no ADR.
- **Regra de texto legal exibido a um titular: sempre gerado no servidor, nunca confiado ao
  cliente, snapshotado na linha do registro e impresso no artefato final.** Mesmo padrão de
  `anamnesis_responses.questions_snapshot`. Aplicado a dois lugares: aceite de termos no
  cadastro (`users.terms_accepted_at`/`terms_version`) e consentimento da ficha de anamnese
  (`anamnesis_responses.consent_text_snapshot`/`consent_version`/`consent_accepted_at`,
  gerado por `anamnesis/domain/build-anamnesis-consent-text.ts`). Submissão rejeita
  (`ANAMNESIS_CONSENT_REQUIRED`) se a versão enviada pelo cliente não bater com a vigente no
  servidor — protege contra formulário aberto durante um deploy do texto.
- **Sem banner de cookies**: decisão deliberada, não lacuna — o app não grava
  `document.cookie`, não usa analytics/pixel de terceiros, fontes são self-hosted em build.
  Único armazenamento local é `inkops_session` (necessário) e `theme` (funcional). Se isso
  mudar (analytics, pixel), a Política de Cookies e um consent manager real precisam entrar
  juntos, antes da ativação.
- **Migration escrita à mão exige registro manual em `meta/_journal.json`** — o
  `migrate()` do drizzle-orm só aplica migrations listadas no journal; uma migration nova
  sem entrada correspondente é **silenciosamente ignorada** por `db:migrate` (sem erro,
  simplesmente não aplica). Todo fluxo de migration manual (ver `env_migration_snapshot_gap`
  na memória de sessão) precisa desse passo extra antes de rodar `db:migrate`.
- **Pendência dura fora do código**: `features/legal/constants/entity.ts` (`LEGAL_ENTITY`)
  tem placeholders `[PREENCHER: ...]` para razão social/CNPJ/endereço/encarregado — bloqueia
  o site de ir ao ar até serem preenchidos com dados reais (identificação do fornecedor,
  CDC; encarregado, LGPD art. 41).
- **Tier 2 (não resolvido nesta fatia)**: cron de retenção (anamnese expirada, convites
  expirados, notifications, audit logs), `anamnesis_responses.customer_id` órfão ao deletar
  cliente (FK `set null`), limpeza de Storage no delete de qualquer entidade, bucket
  `avatars` público com path adivinhável, PII em `audit_logs.metadata` sem TTL, export de
  dados por titular.

### Notificações — núcleo reutilizável (2026-06-15)

- **Módulo `modules/notifications/`**: `NotificationService.notify({userId, orgId?, type, title, body?, data?, email?, actionUrl?, actionLabel?})` cria a notificação **in-app** (tabela `notifications`, migration `0008`) e dispara **e-mail** via `MailService.sendNotification` (best-effort em `try/catch` — falha nunca quebra agenda/estoque/cron). **Outros módulos injetam `NotificationService`** (exportado).
- **E-mail transacional centralizado (ADR-0012)**: módulo dedicado `modules/mail/` (sem dep de auth/notifications → evita ciclo) é dono do port `IEmailSender`/`ResendEmailSender` e do `MailService` (`sendOrgInvite`/`sendPasswordReset`/`sendWelcome`/`sendNotification`). Templates **React Email** `.tsx` em `modules/mail/templates/` (preview: `pnpm --filter backend email:dev`). **`IEmailSender.send`**: `false` = desabilitado (no-op, dev), `true` = enviado, **lança** em falha real. **Críticos (abortam):** convite (cria→envia→em falha **reverte** o convite + `InvitationEmailFailedException`/HTTP 502) e **reset de senha**. **Best-effort:** notificações/crons e welcome. **Reset de senha saiu do GoTrue**: `IAuthProvider.generatePasswordResetLink` (`admin.generateLink type=recovery`, sem enviar) → enviamos via Resend; `null` p/ user inexistente (sem enumeração). Welcome no sign-up. `NOTIFICATIONS_FROM_EMAIL` exige domínio verificado no Resend.
- A tabela `notifications` **não tem RLS** — acesso só pelo módulo, sempre escopado por `user_id` no código, via **`DRIZZLE_ADMIN`**. Inbox por usuário: `GET/POST /me/notifications` (`AuthGuard`, resolve `authId→users.id`).
- **Gatilhos atuais**: (1) indisponibilidade criada por um membro → notifica os **owners** (exceto o autor), no `CreateCalendarEventUseCase`; (2) **lembrete de agenda** via cron.
- **Cron interno**: `CronSecretGuard` (header `x-cron-secret` == env `CRON_SECRET`) protege `POST /internal/cron/*` (sem Auth/Org guard). `POST /internal/cron/agenda-reminders` lembra appointments `scheduled` que começam nas próximas 24h e seta `reminder_sent_at` (**idempotente**). No Railway, um job agendado bate nesse endpoint. **Queries de cron/cross-user usam `DRIZZLE_ADMIN`** (sem contexto de request, RLS bloquearia; e a policy de `users` é self-only).
- **Feature flags completas (ADR-0009) adiadas**: por ora e-mail é gateado por env; in-app sempre ligado.
- Frontend: `features/notifications/` (`useNotifications` polling 30s + `NotificationBell` portaled no `top-header`).

### Relatórios segmentados (reunião 11/06)

- Não é uma única tela — **múltiplos relatórios especializados**: Serviços, Funcionários, Clientes, Financeiros
- Requer **levantamento de requisitos próprio** antes do desenvolvimento

### Feature Flags

- Recursos podem ser desenvolvidos antes e **habilitados só quando viáveis** (custo/validação)
- Controle **global pelo super_admin** (ex.: e-mail, SMS, notificações automáticas desabilitados até validar). Ver ADR-0009

### Outros direcionamentos

- **Dashboard administrativo** é prioritário (indicadores, estoque, movimentações, alertas); futuro: dashboards por funcionário
- **Pré-cadastro** de cliente (nome + telefone) para automações de confirmação de agenda
- **Ambientes** separados: dev / homologação / produção
- **Cron jobs / assíncrono** para mensagens, campanhas, confirmações e retenção
- **Auditoria** obrigatória: quem / o quê / quando / qual org / quais alterações
- **Agenda:** possível integração com Google Calendar (avaliar necessidade real)

### Qualidade — Testes (TDD obrigatório)

**Regra (2026-06-22): TDD em todo module.** Cada module do sistema (back e front) deve ter
**cobertura de testes unitários e de integração**. O fluxo é **test-first**: escreve-se o
teste cobrindo a funcionalidade **antes** da implementação, e só então o código que o faz
passar (red → green → refactor).

- **Unitário**: use-cases (lógica de domínio/autorização — ex. `resolveActor`,
  `resolvePerformer`, `isOwnerOnlyPath`), helpers puros, mappers, schemas.
- **Integração**: fluxos por módulo ponta-a-ponta (controller → use-case → repo) contra um
  Postgres de teste; cobrir os caminhos já mapeados manualmente (convite e2e, visibilidade
  por funcionário/3-contas, caixa append-only, scoping de agenda/serviços).
- Os **scripts manuais de API** (PowerShell) existentes em `docs/testing/` são a base de
  cobertura a portar para a suíte automatizada.
- **Backlog**: a adoção plena é um "ataque de testes" dedicado (ver `roadmap.md` → EPIC
  Qualidade & Testes). A regra entra em vigor já para **todo código novo**.
- Código da v1 não é reaproveitado — apenas regras de negócio.

### Support — canal de suporte B2B, Fatia A (2026-08-10, ADR-0021) + Fatia C (2026-08-15, ADR-0022)

- **Escopo da Fatia A**: portal autenticado (organização abre/responde/reabre
  ticket), fila de atendimento admin (super_admin), SLA (breach/near-breach via cron),
  anexos, notificações por e-mail. Formulário público/anônimo e e-mail-to-ticket foram
  **adiados de propósito** nesta fatia, gated por uma investigação de viabilidade
  ainda não feita — **superado pela Fatia C** (abaixo): investigação concluída
  (`docs/spikes/support-inbound-email.md`), ambas as superfícies entregues.
  `tickets.org_id`/`ticket_responses.org_id`/`ticket_attachments.org_id` **eram
  `NOT NULL`** na Fatia A (migration `0038`, sem ramificação de ticket órfão) —
  **passaram a nullable na Fatia C** (migration `0044`, ver abaixo e ADR-0022).
- **Autorização por coluna via `DRIZZLE_ADMIN` escopado, não RLS/trigger** (decisão
  central da fatia, ver ADR-0021 para o histórico completo de tentativas
  rejeitadas): `create-ticket`, `add-customer-response`, `reopen-ticket` e
  `upload-ticket-attachment` (as 4 escritas que o portal do cliente aciona, via
  `SupportController` — `orgs/:orgId/support`, `AuthGuard`+`OrgMembershipGuard`)
  escrevem via `DRIZZLE_ADMIN` com `org_id` vindo do path (já autorizado pelo
  `OrgMembershipGuard` antes do use-case), nunca de um campo livre do body — é o
  use-case, não a RLS, que decide quais campos o tenant pode setar. Leituras do
  portal continuam via `DRIZZLE` normal (RLS ativa) + filtro explícito de `org_id`
  no repositório como defesa em profundidade. A fila admin e o cron de SLA também
  usam `DRIZZLE_ADMIN`, mas por serem legitimamente cross-org — motivação diferente,
  não confundir os dois casos.
- **Nota interna (`is_internal_note`) nunca vaza pro portal do cliente — dupla
  proteção**: a RLS de `ticket_responses_select` já exclui na origem
  (`is_internal_note = false` na policy, migration `0039`), **e** a camada de
  aplicação também filtra (`DrizzleTicketResponseRepository.listByTicketInOrg` só
  inclui internas quando `includeInternal=true`, usado só pelos métodos `*AsAdmin`).
  Anexos vinculados a uma resposta interna são filtrados do mesmo jeito nas queries do
  portal (`DrizzleTicketAttachmentRepository.listByTicketInOrg`/`findByIdInOrg` fazem
  `LEFT JOIN ticket_responses` + `is_internal_note = false OR response_id IS NULL`) —
  mesma garantia, dois níveis independentes.
- **SLA é 24/7 wall-clock** (sem calendário de horário comercial) — `computeSlaDueDates`
  materializa `slaFirstResponseDueAt`/`slaResolutionDueAt` na criação do ticket a
  partir de `ticket_categories.sla_first_response_minutes`/`sla_resolution_minutes`,
  nunca recalculado a partir da categoria depois. Exceção: na **reabertura**
  (`ReopenTicketUseCase`), o SLA de **resolução** é recalculado explicitamente
  (`resetResolutionSla`); o SLA de **primeira resposta** fica congelado (não é tocado
  por `resetResolutionSla`, que só mexe em `slaResolutionDueAt`/
  `slaResolutionBreachedAt`/`slaWarningNotifiedAt`).
- **E-mails de notificação são best-effort** (mesmo padrão de ADR-0012): todo método de
  `SupportNotificationService` captura a própria exceção e só loga (nunca PII do
  cliente em log, só `ticket.id`) — o caller (use-case) nunca precisa de try/catch.
- **Débito técnico conhecido e aceito para depois** (não bloqueante para a Fatia A;
  os itens "e-mail-to-ticket" e "formulário público/anônimo" que constavam aqui foram
  **entregues na Fatia C**, ver ADR-0022 — removidos desta lista):
  cleanup de anexos órfãos no Storage; horário comercial no cálculo de SLA;
  `tickets.slaWarningNotifiedAt` é um único campo compartilhado entre o alerta de
  primeira resposta e o de resolução (`SweepTicketSlaUseCase.sweepOne`) — dentro do
  MESMO tick os dois alertas disparam normalmente (ambas as condições são calculadas
  antes de marcar o campo); o risco é **entre ticks**: qual prazo ficar "near breach"
  primeiro marca `slaWarningNotifiedAt`, e um near-breach posterior do OUTRO prazo (em
  tick futuro) é silenciosamente ignorado, porque as duas condições checam o mesmo
  campo (pode perder um aviso em casos raros); e a RLS de
  `tickets_update` permanece na forma permissiva original (sem `WITH CHECK`/trigger de
  coluna) — inofensivo hoje porque o único caminho de código que faz UPDATE é
  `updateAsAdmin`, mas é uma regressão de defesa-em-profundidade aceita
  conscientemente (ver ADR-0021 → Consequências).
- **Tickets órfãos + e-mail-to-ticket, Fatia C (2026-08-15, ADR-0022)**: `org_id` de
  `tickets`/`ticket_responses`/`ticket_attachments` passou a **nullable** (migration
  `0044`) — formulário público (`create-public-ticket`, Cloudflare Turnstile + rate
  limit) e webhook de e-mail (`handle-inbound-email`, Resend Inbound + verificação
  Svix) criam ticket **sem organização**, visível só a `super_admin` na fila de
  triagem. TODAS as policies de SELECT/UPDATE ramificam explicitamente
  `(org_id IS NULL AND is_super_admin()) OR (org_id IS NOT NULL AND (is_super_admin()
OR is_org_member(org_id)))`; as de INSERT exigem `org_id IS NOT NULL AND (...)` sem
  ramo órfão — nenhum caminho via RLS comum (`app_user`) cria linha órfã, só
  `DRIZZLE_ADMIN`. **Vínculo a uma organização é sempre manual** (ação explícita de
  `super_admin` na fila admin via `LinkTicketToOrganizationUseCase`, nunca heurística
  automática por remetente/domínio) e propaga `org_id` para ticket + respostas +
  anexos numa única transação com assert pós-update. **Threading de e-mail por
  plus-address (`suporte+{ticketId}@assessorink-so.com`) sempre exige confirmar que o
  remetente do e-mail bate com `requesterEmail` do ticket** — nunca confia no
  plus-address sozinho (é público/forjável). Detalhe completo, incluindo o bug real de
  try/catch-dentro-de-transação corrigido na idempotência do webhook, em ADR-0022.

### M-P2b — Auto-cadastro/atualização de cliente: backend (2026-08-19, P-2 fatia 2/4)

- **Módulo `customer-self-service`, fronteira de import unidirecional**: importa
  `customers`, `anamnesis`, `mail`, `auth`/`orgs`, `audit` — nenhum desses importa de
  volta. 6 use-cases: 2 autenticados (gerar convite, cenários 1 e 3) + 4 públicos (GET+POST
  por cenário). Continua M10b (link público sem login, `.memory/domain-rules.md` seção
  M10b) para o mesmo padrão de token 256-bit/`DRIZZLE_ADMIN` restrito/throttle, mas em
  tabelas próprias (`customer_self_registrations`, `customer_update_invitations`,
  migration `0052`, commit `3725767`).
- **Retry-safety do cenário 1 (submit combinado customer+anamnese) é por marcador
  persistido, não por lookup de e-mail**: `customer_self_registrations.customer_id` é
  gravado (via `linkCustomer`) IMEDIATAMENTE após criar/reutilizar o customer, ANTES de
  delegar a `SubmitAnamnesisResponseUseCase` — é esse campo, não `findByEmailInOrg`, que
  decide se uma retentativa deve `updateCoreFields` ou `createForOrg`
  (`registration.customerId ?? (await findByEmailInOrg(...))?.id`). Buscar só por e-mail
  quebra se o e-mail do customer mudar entre tentativas (ex. via cenário 3 no meio de um
  retry do cenário 1) — acharia `null` e criaria um segundo customer. A ordem
  `linkCustomer(registro) → linkCustomer(anamnese) → submit` é obrigatória: o repositório
  de anamnese faz `LEFT JOIN customers`, então pular o vínculo antes do submit faz a cópia
  assinada por e-mail ser silenciosamente pulada (mesmo mecanismo do M10b).
- **Reuso de convite pendente exige `serviceTypeId` (cenário 1) igual ao pedido novo** —
  senão o convite antigo (ligado à ficha errada) é reaproveitado silenciosamente. Quando
  diverge (ou expirou), o registro `pending` é deletado (policy de DELETE só permite
  `status='pending'`) e recriado; o `anamnesis_response` do convite descartado fica órfão
  de propósito (sem policy DELETE ali, é histórico).
- **`IPublicCustomerWriter`/`DrizzlePublicCustomerWriter`: novo precedente de
  DRIZZLE_ADMIN em caminho público de ESCRITA em `customers`** (M10b já usava admin em
  anamnesis, isso estende o padrão para o módulo `customers`). Como `customers` não tem FK
  composta `(id, org_id)` sendo referenciada por essas escritas, toda query filtra
  `org_id` explicitamente em código (defesa em profundidade, já que admin bypassa RLS
  totalmente) — inclusive o `create`, que recebe `orgId` como parâmetro posicional
  separado do resto dos dados (nunca dentro do blob de input, para não repetir o mesmo
  buraco que a whitelist de campos já fecha). Unique violation (23505) é distinguida por
  NOME da constraint (`customers_org_email_lower_uq`), não só pelo código — `customers`
  tem outra constraint única (`customers_id_org_id_uq`, também da migration 0052) que não
  deve virar `CustomerEmailAlreadyExistsException`. A função que caça o código 23505
  percorre `error.cause` recursivamente (gotcha do `drizzle-orm@0.45.2` já documentado na
  seção M10b acima) — qualquer novo repositório que capture unique violation deve seguir
  esse padrão, não o antigo `error.code` direto.
- **`IAnamnesisResponseRepository.linkCustomer(responseId, customerId, orgId)`** (3
  parâmetros — o `orgId` foi adicionado depois de review, não estava no desenho
  original): `anamnesis_responses.customer_id` só tem FK simples pra `customers.id`, sem
  par composto com `org_id` como as tabelas novas de convite têm — o filtro de `orgId` no
  `WHERE` do UPDATE é a única defesa contra vincular resposta de uma org a customer de
  outra, já que o método roda via `DRIZZLE_ADMIN`.
- **DTO público do cenário 3 inclui `email`** (decisão de produto explícita da reunião —
  ver `docs/planning/2026-08-19-meeting-backlog.md`, "cenário 3" lista endereço/telefone/
  e-mail como campos atualizáveis) — cuidado ao ler o código sem esse contexto: o
  use-case já validava conflito de e-mail antes do DTO expor o campo (branch ficou
  "morto" por um passo intermediário do desenvolvimento, corrigido antes do fim da fatia).
- **Pendente para fatia 3/4 (frontend)**: páginas públicas `/customer-registration/:token`
  e `/customer-update/:token`, telas autenticadas de disparo dos 2 convites no módulo
  Clientes (hoje só "Novo cliente"), `design` das 3 telas novas antes do
  `frontend-implementer` (regra já prevista no backlog).

### Pendências não bloqueantes para V1

- Sistema de créditos do cliente (manter da v1 ou reprojetar?)
- Permissões granulares do `employee` (owner configura ou é fixo por role?)
- Cobrança de múltiplas orgs (por org? escalonado? por contrato?)
