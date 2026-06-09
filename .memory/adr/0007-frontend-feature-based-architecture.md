---
name: adr-0007-frontend-feature-based-architecture
description: Frontend Next.js organizado por domínio (Feature-Based Architecture) — sem pastas genéricas como components/, hooks/, services/
metadata:
  type: project
---

# ADR-0007: Feature-Based Architecture no Frontend Next.js

**Date:** 2026-06-08
**Status:** Accepted

## Context

O frontend começou com estrutura genérica (`components/`, `contexts/`, `lib/`) sem separação por domínio de negócio. À medida que novas features (dashboard, agendamentos, clientes, financeiro) forem adicionadas, essa estrutura causaria acoplamento crescente e dificuldade de navegação.

## Decision

Adotar **Feature-Based Architecture** com quatro camadas explícitas em `src/`:

```
src/
├── features/        código organizado por domínio de negócio
├── shared/          componentes e utilitários usados por 2+ features
├── infrastructure/  clientes HTTP, interceptors, integrações externas
└── providers/       composição de providers globais para _app.tsx
```

### Estrutura de cada feature

```
src/features/<domain>/
├── components/      componentes React do domínio
├── hooks/           hooks customizados (use<Domain>.ts)
├── lib/             utilitários e helpers do domínio
├── providers/       context providers do domínio
├── services/        chamadas de API via apiRequest()
├── types/           interfaces e tipos TypeScript
└── index.ts         barrel export (único ponto de saída público)
```

### Piloto implementado: feature `auth`

```
src/features/auth/
├── components/
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   └── recover-form.tsx
├── hooks/
│   └── use-auth.ts
├── lib/
│   └── session.ts        (localStorage wrapper)
├── providers/
│   └── auth-provider.tsx (AuthContext + AuthProvider)
├── types/
│   └── index.ts          (AuthUser, AuthSession, StoredSession, AuthContextValue)
└── index.ts
```

### Shared layer

```
src/shared/
├── components/ui/     shadcn components (Button, Card, Input, Label, ...)
├── lib/utils.ts       cn() — único utilitário compartilhado atual
└── index.ts
```

Regra: mover para `shared/` apenas quando o código for usado por **2 ou mais features** e não tiver regra de negócio específica.

### Infrastructure layer

```
src/infrastructure/
└── api/
    └── client.ts    apiRequest<T>() — fetch wrapper com auto-refresh de token, Bearer injection
```

Toda chamada HTTP do app passa por `apiRequest()`. Features nunca chamam `fetch` diretamente.

### Providers layer

```
src/providers/index.tsx    AppProviders — composição de todos os providers globais
```

`pages/_app.tsx` importa apenas `<AppProviders>`. Para adicionar novo provider global: editar `providers/index.tsx`.

### Pages como thin wrappers

Pages Next.js (`pages/`) apenas renderizam o componente da feature:

```tsx
// pages/auth/login.tsx
import { LoginForm } from "@/features/auth"
const Login: NextPage = () => <LoginForm />
export default Login
```

Lógica, estado e UI vivem nos feature components. Pages são ponto de entrada do roteador, não contêineres de lógica.

## Rationale

- **Coesão**: tudo de um domínio fica junto — fácil de encontrar e deletar
- **Baixo acoplamento**: features se comunicam apenas via barrel exports (`@/features/<domain>`)
- **Escalabilidade**: adicionar nova feature = criar nova pasta, zero impacto nas existentes
- **Testabilidade**: cada feature é um módulo isolado, fácil de mockar dependências

## Aliases TypeScript

O alias `@/*` → `./src/*` cobre todos os caminhos. Imports canônicos:

```typescript
import { useAuth } from "@/features/auth"
import { Button } from "@/shared/components/ui/button"
import { apiRequest } from "@/infrastructure/api/client"
import { AppProviders } from "@/providers"
```

**Evitar** imports relativos profundos (`../../`, `../../../`).

## Regras obrigatórias

1. **Feature primeiro**: código de domínio vai em `features/<domain>/`, nunca em `shared/` direto
2. **Barrel exports**: toda feature expõe `index.ts` — externos importam do barrel, nunca de caminhos internos
3. **Sem context de domínio**: `AuthContext` fica dentro de `features/auth/providers/`, não em `providers/` global
4. **Providers globais**: apenas `providers/index.tsx` — contexts de auth, theme, locale, i18n
5. **API via client**: `apiRequest()` em `infrastructure/api/client.ts` — nunca `fetch` direto em components/hooks
6. **Pages finas**: pages renderizam feature components, não contêm lógica inline

## Alternatives considered

- **Manter estrutura genérica** — simples agora, cresce em problema à medida que features aumentam; rejeitado
- **Next.js App Router com Server Components** — migração futura possível; Pages Router mantido por compatibilidade com auth flow atual
- **Atomic Design** — não mapeia bem para domínios de negócio; rejeitado

## Consequences

### Próximas features a criar

Para cada novo domínio (`dashboard`, `appointments`, `clients`, `billing`, `settings`):

```
1. Criar src/features/<domain>/
2. Criar types/index.ts com interfaces do domínio
3. Criar services/ com chamadas via apiRequest()
4. Criar hooks/use-<domain>.ts
5. Criar components/ com UI do domínio
6. Criar index.ts (barrel)
7. Criar pages/<domain>/*.tsx como thin wrappers
```

### ESLint ajustado

`react/prop-types: "off"` adicionado ao `@repo/eslint-config/next.js` — TypeScript já valida props, a regra é redundante e causava falsos positivos em componentes com `forwardRef`.
