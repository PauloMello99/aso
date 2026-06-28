---
name: supabase-coupling
description: Mapa de acoplamento ao Supabase (auth, storage, banco/RLS) e o que muda numa migração de provedor — base estratégica do SEC-3
metadata:
  type: architecture
---

# Mapa de acoplamento ao Supabase — SEC-3

> Snapshot de **2026-06-27**. Objetivo do SEC-3 (estratégico): reduzir o acoplamento
> ao Supabase para viabilizar uma **possível migração de banco/provedor futura** e tornar
> o **sign-up atômico**. Este documento inventaria **todos** os pontos de contato e o que
> precisaria mudar por camada. A parte de atomicidade do sign-up já foi implementada
> (ver "Sign-up atômico" abaixo).

## TL;DR por camada

| Camada | Acoplamento | Abstraído? | Esforço p/ migrar |
|---|---|---|---|
| **Auth** | `SupabaseAuthProvider` | ✅ `IAuthProvider` | Baixo — nova impl + bind |
| **Storage** | `SupabaseStorageProvider` | ✅ `IStorageProvider` | Baixo/médio — nova impl + provisionar bucket |
| **Banco (driver)** | `pg` + Drizzle | ✅ Postgres puro | Nenhum — portável |
| **Banco (RLS)** | `auth.uid()`, schema `auth`, `request.jwt.claims` | ⚠️ convenção Supabase | **Alto** — o ponto mais profundo |
| **Frontend** | — | ✅ usa só a API do backend | Nenhum |

## 1. Auth — JÁ abstraído

- Porta: `IAuthProvider` (`modules/auth/application/ports/auth-provider.interface.ts`),
  token `AUTH_PROVIDER`. Impl: `infrastructure/providers/supabase-auth.provider.ts`
  (usa `@supabase/supabase-js`, clientes `admin` service-role + `anon`).
- Bind em `auth.module.ts`: `{ provide: AUTH_PROVIDER, useClass: SupabaseAuthProvider }`.
- Métodos cobertos: `signUp` (`admin.createUser` + `signIn`), `signIn`
  (`anon.signInWithPassword`), `signOut`, `refreshToken`, `forgotPassword`
  (`resetPasswordForEmail` com redirect p/ `FRONTEND_URL/auth/reset-password`),
  `resetPassword` (`setSession` + `updateUser`), `updateEmail`, `deleteUser`,
  `verifyToken` (`admin.getUser` do access token).
- **Migrar** = nova classe que implemente `IAuthProvider` + trocar o `useClass`. Nenhum
  use-case toca o Supabase diretamente. O `AuthGuard` chama `verifyToken` pela porta.

## 2. Storage — JÁ abstraído

- Porta: `IStorageProvider` (`modules/auth/application/ports/storage-provider.interface.ts`),
  token `STORAGE_PROVIDER`. Impl: `supabase-storage.provider.ts` (bucket `avatars`
  público + `uploadFile`/`createSignedUrl`/`removeFile` genéricos).
- Consumidores: upload de avatar (auth) e anexos de cliente
  (`customers/.../customer-attachments`).
- **Acoplamento residual**: a migration `0010_avatars_bucket.sql` provisiona o bucket via
  `INSERT INTO storage.buckets (...)` — schema `storage.*` é do Supabase. Numa migração,
  o provisionamento do bucket sai do SQL e vira responsabilidade do novo backend (S3, R2…).
- **Migrar** = nova classe `IStorageProvider` + trocar bind + reprovisionar bucket fora do SQL.

## 3. Banco — driver portável, RLS é o ponto profundo

- **Driver**: conexão via `pg` (`Pool`) + Drizzle (`database.module.ts`). Strings:
  `DATABASE_URL` (papel `postgres`/service-role, **BYPASSRLS** — migrations + bootstrap)
  e `DATABASE_APP_URL` (papel `app_user`, **NOBYPASSRLS** — runtime). Isso é Postgres puro;
  qualquer Postgres gerenciado serve.
- **RLS (o acoplamento mais profundo)**: as policies (migrations `0000`, `0003`, `0015`,
  `0019`) usam **`auth.uid()`** — função do Supabase que lê o claim `sub` de
  `request.jwt.claims`. O `RlsContext` (`database.module.ts`) faz, por request e dentro de
  uma transação, `SELECT set_config('request.jwt.claims', '{"sub":...}', true)` para que
  `auth.uid()` resolva o usuário. Helpers `is_super_admin`/`is_org_member`/`is_org_owner`
  derivam disso. Ver [[clean-architecture]] e ADR-0005 (multitenant single-DB RLS).
- **Ponte de identidade**: `users.auth_id` (uuid) referencia o usuário de `auth.users` do
  Supabase. Os `created_by` já apontam para `users.id` (app id) desde SEC-2, então o
  domínio não depende do id do provedor — só a tabela `users` guarda o `auth_id`.
- **Migrar** = numa instância Postgres não-Supabase é preciso recriar o contrato que o
  Supabase fornece de fábrica:
  - função `auth.uid()` (ou reescrever as policies para ler `request.jwt.claims` direto);
  - schema/shim `auth` (e o vínculo `users.auth_id`);
  - schema `storage.*` deixa de existir → storage 100% pela `IStorageProvider`.

## 4. Frontend — sem acoplamento

- Nenhum import de `@supabase/*` no `apps/frontend`. Autentica via API do backend e guarda
  a sessão própria em `localStorage.inkops_session` (ver [[frontend-feature-architecture]]).
  Migração de provedor é transparente para o front.

## 5. Variáveis de ambiente (pontos de configuração)

- Auth + Storage: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Banco: `DATABASE_URL` (admin/BYPASSRLS), `DATABASE_APP_URL` (app_user/NOBYPASSRLS).
- Correlatos: `FRONTEND_URL` (redirect de reset de senha).

## Sign-up atômico (implementado no SEC-3)

`SignUpUseCase` (`modules/auth/use-cases/sign-up.use-case.ts`) cria **dois** recursos em
sistemas distintos sem transação compartilhada: a identidade no provedor de auth e a linha
em `public.users`. Antes, se o `userRepo.create` falhasse, ficava um **auth user órfão**
(bloqueava recadastro do e-mail). Agora é uma **saga com compensação**: em falha da
persistência, faz `auth.deleteUser(authId)` (best-effort, com log) e re-lança o erro
original. Como a compensação usa `IAuthProvider.deleteUser`, continua agnóstica de provedor.

## Próximos passos sugeridos (quando priorizar a migração de fato)

1. Extrair o provisionamento de bucket do SQL (`0010`) para o backend/IaC do storage novo.
2. Definir a estratégia de RLS fora do Supabase: `auth.uid()` próprio + schema `auth` shim,
   **ou** policies que leem `request.jwt.claims` diretamente (remove a dependência de `auth`).
3. Escrever uma 2ª impl de `IAuthProvider`/`IStorageProvider` e cobrir com testes de contrato
   (mesma suíte rodando contra Supabase e contra o provedor novo). Ver regra de TDD por module.
