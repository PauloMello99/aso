---
name: adr-0006-clean-architecture-solid
description: Reestruturação do backend com Clean Architecture e princípios SOLID para desacoplar ORM, banco e serviços externos
metadata:
  type: project
---

# ADR-0006: Clean Architecture + SOLID no Backend NestJS

**Date:** 2026-06-08
**Status:** Accepted

## Context

Os use-cases do backend injetavam diretamente o token `DRIZZLE` e importavam `schema.*` do Drizzle ORM, acoplando a camada de aplicação à infraestrutura de persistência. Além disso, use-cases e o `SupabaseAuthProvider` lançavam exceções HTTP (`NotFoundException`, `BadRequestException`, `UnauthorizedException`) — conceitos da camada de interface dentro de camadas que deveriam ser agnósticas ao framework HTTP.

O objetivo é garantir que ORM, banco de dados e serviços externos (Supabase, futuramente Stripe/email) possam ser trocados tocando **apenas** a camada `infrastructure/`, zero mudanças em `domain/` ou `application/`.

## Decision

Adotar **Clean Architecture** com quatro camadas explícitas dentro de cada módulo de feature:

```
Domain         — entidades, interfaces de repositório, exceções de domínio (zero imports externos)
Application    — use-cases + ports (ex: IAuthProvider) — apenas @Injectable/@Inject do NestJS
Infrastructure — implementações Drizzle, adapters Supabase, NestJS modules de binding
Interface      — controllers, DTOs, guards, decorators, exception filters (HTTP)
```

### Regra de dependência (The Dependency Rule)

Camadas externas dependem de internas. **Nunca o inverso.**

```
Interface → Application → Domain
Infrastructure → Domain
```

### Estrutura de diretórios por módulo

```
src/modules/<feature>/
├── domain/
│   ├── <entity>.entity.ts              # plain class, readonly props, static create()
│   ├── <entity>.repository.interface.ts # interface + Symbol token
│   └── exceptions/
│       └── <entity>-not-found.exception.ts
├── application/
│   ├── ports/                          # interfaces de serviços externos (ex: IAuthProvider)
│   └── use-cases/
│       └── <verb>-<entity>.use-case.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── <entity>.repository.ts      # DrizzleXxxRepository implements IXxxRepository
│   │   └── <entity>.mapper.ts          # row Drizzle ↔ domain entity
│   └── <feature>-infrastructure.module.ts  # binding Symbol → implementation
└── <feature>.module.ts                 # imports infra, providers use-cases, exports
```

### Repository Pattern

**Interface no domain** — define o contrato sem nenhuma dependência:
```typescript
// domain/user.repository.interface.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface IUserRepository {
  findByAuthId(authId: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
}
```

**Implementação na infra** — única camada que conhece Drizzle:
```typescript
@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}
  // queries Drizzle aqui
}
```

**Binding no módulo de infra**:
```typescript
@Module({
  providers: [{ provide: USER_REPOSITORY, useClass: DrizzleUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UserInfrastructureModule {}
```

**Use-case injeta a interface**, não a implementação:
```typescript
@Injectable()
export class GetMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}
}
```

### Domain Entities

Plain classes sem decorators, propriedades `readonly`, factory estático `create()`:
```typescript
export class UserEntity {
  readonly id: string; readonly authId: string; // ...
  private constructor(props: UserEntityProps) { Object.assign(this, props); }
  static create(props: UserEntityProps): UserEntity { return new UserEntity(props); }
}
```

### Mappers

Vivem em `infrastructure/persistence/`, ao lado do repositório que os usa:
- `toDomain(row: DrizzleRow): DomainEntity`
- `toPersistence(entity: DomainEntity): InsertShape`

O schema Drizzle fica em `src/database/schema/` — **não move**. É o persistence model.

### Domain Exceptions → HTTP

```typescript
// common/exceptions/domain.exception.ts
export abstract class DomainException extends Error {
  abstract readonly code: string;
}

// módulo/domain/exceptions/*.exception.ts
export class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND';
}
```

`DomainExceptionFilter` registrado em `main.ts` como primeiro filtro global mapeia `code` → HTTP status. O mapeamento `CODE_TO_STATUS` vive no filter (camada de interface), não no domínio.

Códigos de exceção definidos até hoje:
| Code | HTTP |
|---|---|
| `USER_NOT_FOUND` | 404 |
| `INVALID_CREDENTIALS` | 401 |
| `AUTH_TOKEN_EXPIRED` | 401 |
| `ORGANIZATION_NOT_FOUND` | 404 |
| `SLUG_ALREADY_TAKEN` | 409 |

### Ports para serviços externos

`IAuthProvider` vive em `auth/application/ports/` — a aplicação define a interface, a infra implementa.
`SupabaseAuthProvider` implementa `IAuthProvider` em `auth/infrastructure/providers/`.
Para trocar Supabase por Clerk: nova classe `ClerkAuthProvider implements IAuthProvider`, alterar binding no `AuthModule`. Zero mudanças nos use-cases.

## Rationale

- **Testabilidade**: use-cases podem ser testados com mocks sem banco real
- **Swappability**: trocar Drizzle por TypeORM = nova implementação de repositório + alterar binding
- **Explicitabilidade**: o que é domínio vs. infraestrutura vs. HTTP fica visível na estrutura de pastas
- **SOLID**: SRP (cada camada uma responsabilidade), DIP (use-cases dependem de abstrações, não implementações), OCP (adicionar nova implementação sem modificar use-cases)

## Alternatives considered

- **Manter use-cases com Drizzle direto** — simples a curto prazo, mas bloqueia troca de ORM/banco
- **@nestjs/cqrs com CommandBus** — overhead desnecessário neste estágio; pode ser adicionado depois
- **Aggregate roots DDD completos** — ceremony excessiva sem invariantes complexas; rejeitado

## Consequences

### O que NÃO fazer (armadilhas evitadas)

- **Não criar domain events** — só quando houver side effect cross-domain que justifique
- **Não criar `Repository<T>` genérico** — cada `IXxxRepository` tem só os métodos que o domínio precisa
- **Não usar @nestjs/cqrs** — use-case-por-operação já é suficiente
- **Não criar aggregate roots** — CRUD com repositórios diretos é suficiente sem invariantes complexas
- **Não mover `database/schema/`** — é persistence model, fica onde está; só `infrastructure/` o importa
- **Não colocar class-validator em entidades de domínio** — validação de input fica nos DTOs da camada Interface

### Piloto implementado: módulo `user`

| Arquivo | Camada |
|---|---|
| `user/domain/user.entity.ts` | Domain |
| `user/domain/user.repository.interface.ts` | Domain |
| `user/domain/exceptions/user-not-found.exception.ts` | Domain |
| `user/infrastructure/persistence/user.mapper.ts` | Infrastructure |
| `user/infrastructure/persistence/user.repository.ts` | Infrastructure |
| `user/infrastructure/user-infrastructure.module.ts` | Infrastructure |
| `user/application/use-cases/get-me.use-case.ts` | Application |
| `user/user.module.ts` | Composition Root |

### Próximos módulos a migrar

Seguir o mesmo padrão para: `organization` (memberships, invitations), `studio` (customers, services, materials, transactions, calendar_events).

### Módulos globais NestJS permanecem

- `ConfigModule.forRoot({ isGlobal: true })` — sem mudanças
- `DatabaseModule` — `@Global()`, continua exportando `DRIZZLE` symbol para uso exclusivo pelos repositórios de infra
