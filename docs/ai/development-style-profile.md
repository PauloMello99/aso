# Development Style Profile — ink-ops

> Regras de estilo e convenções de desenvolvimento deste repositório. Fonte normativa
> para os agentes em `.claude/agents/` e para o protocolo em `docs/ai/agentic-workflow.md`.
> A referência canônica e mais detalhada é `.memory/domain-rules.md` + os ADRs em
> `.memory/adr/` — este documento resume o que os agentes precisam aplicar.

## 1. Arquitetura

**Backend — Clean Architecture de 4 camadas** (ADR-0004 e ADR-0006), replicada de forma
idêntica em todos os módulos de `apps/backend/src/modules/<feature>/`:

| Camada | Pasta | Conteúdo |
|---|---|---|
| Domínio | `domain/` | `*.entity.ts`, `*.repository.interface.ts`, `exceptions/*.exception.ts`, lógica pura — zero imports de framework |
| Aplicação | `application/use-cases/` | **um arquivo por operação** (`create-<entity>.use-case.ts`); às vezes `application/ports/` |
| Infraestrutura | `infrastructure/persistence/` | `drizzle-<feature>.repository.ts` + `<feature>.mapper.ts` + `<feature>-infrastructure.module.ts` |
| Interface | `interface/` | `*.controller.ts`, `dto/*.dto.ts`, `guards/`, `decorators/` |

- DI de repositório por **Symbol token**: `export const X_REPOSITORY = Symbol(...)` + `@Inject(...)`.
- **Use-cases nunca importam DRIZZLE** — dependem só da interface do repositório.
- Cross-cutting em `src/common/` (auth, exceptions, filters, guards, interceptors, telemetry);
  persistência em `src/database/` (schema/, migrator.ts, database.module.ts).
- Receita passo-a-passo de módulo novo em `.memory/domain-rules.md` e no slash command
  `/new-module` (referência: `modules/health/`).

**Frontend — feature-based** (ADR-0007): `apps/frontend/src/features/<feature>/{components,hooks,schemas,types,lib,index.ts}`,
`pages/` fino (pages router), `infrastructure/` (api/client.ts, query/), `shared/`
(components/ui shadcn, hooks, lib, styles), `providers/`.

**Tendência geral**: implementações diretas dentro de um esqueleto arquitetural rígido.
Abstração só onde o padrão exige (interfaces de repositório, ports); nenhuma abstração
especulativa. Arquivos pequenos, de responsabilidade única; entregas fatiadas pequenas.

## 2. Convenções de código

- **Arquivos**: kebab-case com **sufixo semântico obrigatório**: `.use-case.ts`,
  `.repository.interface.ts`, `.repository.ts`, `.entity.ts`, `.mapper.ts`, `.exception.ts`,
  `.dto.ts`, `.controller.ts`, `.module.ts`, `.guard.ts`, `.interceptor.ts`, `.filter.ts`.
  Frontend: hooks `use-*.ts`, schemas `*.schemas.ts`, componentes `*.tsx` kebab-case.
- **Exports nomeados apenas** — evitar `export default`.
- **`function` para funções exportadas**; arrow functions só para callbacks/consts locais.
- Retornos antecipados e validação no topo dos use-cases; imutabilidade preferida.
- Unions em `type`; contratos de objeto em `interface`.
- Comentários esparsos, apenas para restrições não óbvias. Sem JSDoc sistemático.

## 3. TypeScript

- **Strict máximo** (`@repo/typescript-config`): `strict`, `noUncheckedIndexedAccess`,
  `isolatedModules`; decorators habilitados no backend.
- **`any` é banido**; usar `unknown` + narrowing (`catch (e: unknown)`).
- Cast sancionado para mocks em testes: `as unknown as T`.
- Tipos de retorno explícitos em use-cases; DTOs class-validator com definite-assignment `!`.
- Tipos derivados de schema: `$inferSelect`/`$inferInsert` no Drizzle; `z.infer` no frontend;
  tipos Supabase gerados (`db:gen-types`).

## 4. Frontend

- **React Query** com key factory única em `src/infrastructure/query/query-keys.ts`, shape
  `[domain, ...scope, operation?, params?]`, desenhada para invalidação por prefixo.
  Nunca criar keys inline.
- Hooks retornam shapes de domínio normalizados; erros traduzidos via helper de erro de API.
- **Formulários**: zod + react-hook-form + `@hookform/resolvers`.
- **UI**: shadcn/Radix em `shared/components/ui/`; `cn()` (`shared/lib/utils.ts`) obrigatório
  para merge de classes — nunca template string.
- **Estados explícitos**: `Skeleton` durante loading, `EmptyState`/bloco com CTA quando vazio,
  erro tratado — padrão consistente em toda tela.
- **Mobile-first** (`.memory/domain-rules.md`): base ~375px com `sm:`/`md:`/`lg:` progressivos,
  tokens de design — nunca cores Tailwind hardcoded; sidebar como drawer no mobile
  (hamburger no header); padding `p-4 sm:p-6`; grids começam em 1 coluna.

## 5. Backend

- Um controller por módulo em `interface/`, delegando a use-cases; **use-cases nunca lançam
  exceções HTTP** — apenas subclasses de `DomainException`.
- Validação de entrada com **class-validator + class-transformer** nos DTOs.
- Auth: `AuthGuard` (Supabase) + guards de organização
  (`org-membership.guard.ts`/`org-module.guard.ts`, `org-owner.guard.ts`) compostos em todo
  controller escopado por organização; `super_admin` age como owner (ADR-0013);
  `CronSecretGuard` no tick interno.
- Cron unificado (tick periódico), jobs isolados; integrações externas em módulos próprios
  (mail/Resend + React Email ADR-0012, telemetria Better Stack ADR-0014).
- `helmet` + `@nestjs/throttler` habilitados.

## 6. Banco de dados

- **Drizzle ORM** com schema em `src/database/schema/` (subpasta `studio/`), agregado em index.
- Convenções: propriedade camelCase → coluna **snake_case explícita** (`uuid("organization_id")`);
  PK uuid `.defaultRandom()`; timestamps `withTimezone: true` + `.defaultNow()`; FKs com
  `onDelete` explícito; `index()`/`unique()` no argumento de config; `relations()` declaradas.
- **Dinheiro sempre em centavos inteiros** (`amount_cents: integer`) — sem exceção. Caixa
  guarda bruto/taxa/líquido (`amount_gross_cents`/`fee_cents`/`amount_cents`).
- **Migrator custom** (ADR-0003): `pnpm --filter backend db:generate|db:migrate|db:rollback|db:status`;
  hash sha256 do SQL bruto ⇒ **nunca editar um `.sql` gerado**; todo `.sql` tem companheiro
  `.down.sql` (regras no `/new-migration`).
- **Multi-tenancy: single DB + RLS por organização** (ADR-0005): token `DRIZZLE` (role com
  RLS, claims por request via `rls.interceptor.ts` + `set_config` transacional) vs
  `DRIZZLE_ADMIN` (bypass RLS, só bootstrap/cron/guards). Gotcha: leituras
  "read-what-I-just-wrote" precisam usar a MESMA conexão `DRIZZLE` da transação aberta.
- **Caixa append-only** (ADR-0010): lançamentos nunca sofrem UPDATE/DELETE; correção é
  errata (novo registro); saldo é agregado.
- `organization_id` **nunca vem do cliente** em inserts — derivado da sessão.

## 7. Testes

- **Estado atual**: o repositório ainda **não tem suíte automatizada** (sem `test`/`test:e2e`
  configurado; zero `*.spec.ts`). A validação hoje é `check-types` + `lint` + `build`.
- **Direção prevista** (roadmap): TDD por módulo — unit `*.spec.ts` colocado junto do código
  para use-cases/domínio; e2e por feature contra Supabase local. Quando existir, preferir
  **testar comportamento** (entrada→saída dos use-cases, respostas HTTP), não implementação;
  mocks tipados (`jest.Mocked<IRepo>` + `as unknown as`).
- Agentes não inventam comandos de teste inexistentes; registram a lacuna de cobertura.

## 8. Tratamento de erros

- Base abstrata `DomainException` (`common/exceptions/domain.exception.ts`) com `readonly code`
  SCREAMING_SNAKE.
- Mapa central `DomainExceptionFilter.CODE_TO_STATUS` → status HTTP; código novo **deve** ser
  registrado lá; não mapeado cai em 500 e é reportado.
- `AllExceptionsFilter`/filter global único: DomainException → payload estruturado
  (`{ statusCode, code, message, path, timestamp }`); erro desconhecido → 500 genérico
  (nunca vaza internals); só ≥500 vai para Better Stack (ADR-0014).
- Frontend espelha com `ApiError` tipado em `infrastructure/api/client.ts`.
- **Não é Result pattern** — é exceção de domínio + mapa de códigos. Não introduzir Either/Result.

## 9. Segurança

- Defesa em profundidade: guards na aplicação + RLS no banco por organização (ADR-0005),
  sobre `auth.uid()`/claims; `super_admin` via helper dedicado (`is-super-admin.ts`, ADR-0013).
- Segredos só via env; `.env` gitignored; nunca logar tokens/segredos/dados sensíveis.
- Rate limiting via throttler; sessão endurecida.

## 10. Git e processo de entrega

- **Conventional Commits em português, sem acentos**, escopo sempre presente:
  `feat(cashier): ... (M<n> PR<x> <a>/<b>)`. Breaking changes com `!`.
- Corpos longos explicando o **porquê** e decisões de escopo.
- Entregas fatiadas em passos pequenos revisáveis ("PR X de N").
- Critério implícito de conclusão: check-types + lint + build verdes antes do commit;
  `docs(memory)` fechando cada milestone (roadmap + recent-decisions + ADR quando aplicável).

## 11. Author Development Rules

### MUST
1. Usar **pnpm** exclusivamente (nunca npm/yarn); dep em package específico via `pnpm add <pkg> --filter <nome>`.
2. Representar dinheiro como **centavos inteiros** (`*_cents`) em todo o stack.
3. Backend: um use-case por operação; use-cases dependem apenas de interfaces de repositório
   (Symbol token) — **nunca** importar DRIZZLE/infra na camada de aplicação.
4. Erros de negócio: lançar subclasse de `DomainException` com `code` SCREAMING_SNAKE **e
   registrar o código em `DomainExceptionFilter.CODE_TO_STATUS`**.
5. Arquivos em kebab-case com sufixo semântico correto.
6. Exports nomeados; `function` para funções exportadas.
7. TS strict sem `any`; `as unknown as` apenas para mocks em specs.
8. Frontend: query keys só via `infrastructure/query/query-keys.ts`; classes Tailwind só via
   `cn()`; tokens de design (nunca cores hardcoded); mobile-first.
9. Migrations: gerar via `pnpm --filter backend db:generate`, nunca editar o `.sql` gerado,
   sempre criar o `.down.sql` companheiro.
10. `organization_id` derivado da sessão — nunca aceito do cliente.
11. Caixa é append-only (ADR-0010): correção vira errata, nunca UPDATE/DELETE de lançamento.
12. Chamar `memory_search` (MCP `ink-memory`) antes de varrer código para perguntas de "onde/como funciona X".
13. Validar com os scripts reais: `pnpm check-types`, `pnpm lint` (`--max-warnings 0`), `pnpm build`.

### SHOULD
1. Seguir a receita de `/new-module` (referência `modules/health/`) e `/new-migration` para migrations.
2. Reutilizar componentes de `shared/components/ui/` e padrões de feature existentes antes de criar novos.
3. Commits em Conventional Commits pt-BR sem acentos, com escopo e referência de milestone/fatia; corpo explicando o porquê.
4. Fatiar entregas grandes em passos pequenos revisáveis ("PR X de N").
5. Registrar decisões duráveis em ADR (`/adr`) e atualizar `recent-decisions.md`/`roadmap.md` ao fechar milestone.
6. Preferir retornos antecipados e validação no topo; espelhar o estilo do arquivo vizinho (semicolons diferem por app).
7. Usar `EmptyState`/`Skeleton` e tratamento de erro explícito em toda tela nova.
8. Acompanhar use-case/lógica de domínio novo com teste colocado quando o harness de testes existir.

### MAY
1. Usar `unknown` + narrowing quando o tipo é genuinamente desconhecido.
2. Criar `application/ports/` quando o use-case depende de serviço externo.
3. Adicionar helpers puros no domínio quando a regra é reutilizada.

### MUST NOT
1. Executar `git push`, deploy, publish, migrations em banco remoto ou alterar secrets/ambientes.
2. Criar commits sem solicitação explícita do usuário.
3. Usar `git reset --hard`, `git clean -fd` ou apagar branches.
4. Editar arquivos `.sql` de migration já gerados (quebra o hash do migrator).
5. Introduzir Result/Either pattern, `export default`, `any`, cores Tailwind hardcoded ou query keys inline.
6. Usar `DRIZZLE_ADMIN` fora de bootstrap/cron/guards — e nunca para contornar RLS em fluxo de usuário.
7. Refatorar, renomear ou "melhorar" código fora do escopo solicitado; adicionar dependência sem provar que o existente não resolve.
8. Fazer UPDATE/DELETE em lançamentos de caixa (usar errata).
9. Logar dados sensíveis (tokens, segredos, dados financeiros identificáveis).
