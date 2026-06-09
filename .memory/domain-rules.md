---
name: domain-rules
description: Regras de domínio e decisões de modelagem do ink-ops
metadata:
  type: project
---

## Regras de Clean Architecture (backend)

Estas regras derivam do ADR-0006 e são **obrigatórias** em qualquer novo código de backend.

### Onde cada tipo de código vive

| Tipo | Camada | Diretório |
|---|---|---|
| Entidade de domínio | Domain | `<feature>/domain/<entity>.entity.ts` |
| Interface de repositório | Domain | `<feature>/domain/<entity>.repository.interface.ts` |
| Exceção de domínio | Domain | `<feature>/domain/exceptions/<code>.exception.ts` |
| Interface de serviço externo | Application/Ports | `<feature>/application/ports/<service>.interface.ts` |
| Use-case | Application | `<feature>/application/use-cases/<verb>-<entity>.use-case.ts` |
| Implementação de repositório | Infrastructure | `<feature>/infrastructure/persistence/<entity>.repository.ts` |
| Mapper (Drizzle ↔ domain) | Infrastructure | `<feature>/infrastructure/persistence/<entity>.mapper.ts` |
| Controller | Interface | `<feature>/<feature>.controller.ts` |
| DTO + validação | Interface | `<feature>/dto/*.dto.ts` |
| Guard / decorator | Interface | `<feature>/guards/` ou `<feature>/decorators/` |

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
- Sistema de créditos: pendente de definição (não bloqueante para V1)

### Tipos de serviço

- Na v1 eram enums fixos (`tattoo | body_piercing`)
- Na v2 são um **cadastro configurável por org** — tabela `service_types` com `UNIQUE(org_id, name)`
- Mesmo padrão para `material_categories` e `customer_origins` (origens de cliente)
- Impacto: não há enums de domínio para serviços — tudo é row no banco

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

### Billing / assinatura (Stripe)

Produto: "assessoria". Quatro configurações possíveis (gerenciadas pelo super_admin):
1. **Gratuita** — para a própria Ink House
2. **Trial** — 1 mês de teste
3. **Preço cheio** — mensal R$400 / semestral R$2.000 / anual R$4.200
4. **Valor alterado** — acordado por cliente

- Grace period configurável após inadimplência
- Estrutura de produtos Stripe desacoplada por produto

### Qualidade

- Testes unitários + integração do zero
- Código da v1 não é reaproveitado — apenas regras de negócio

### Pendências não bloqueantes para V1

- Sistema de créditos do cliente (manter da v1 ou reprojetar?)
- Permissões granulares do `employee` (owner configura ou é fixo por role?)
- Cobrança de múltiplas orgs (por org? escalonado? por contrato?)
