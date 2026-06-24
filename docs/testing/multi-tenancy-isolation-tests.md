# Multi-tenancy — Testes de Isolamento entre Organizações

> Verifica que um token de uma org **não** acessa dados/rotas de **outra** org. Toda rota
> `/orgs/:orgId/*` deve retornar **403/404** (nunca dados) para quem não é membro.
> Última execução: 2026-06-14 (todos PASS após o fix do `getMembers`).

## Modelo de isolamento (estado atual)
- **Materials** e **Customers**: `@UseGuards(AuthGuard, OrgMembershipGuard)` no controller.
- **Organizations**: escopo **por use-case** (`findByIdAndAuthId` + `isOwner`) — **exceto**
  `GET /orgs/:orgId/members`, que agora também usa `OrgMembershipGuard` (corrigido nesta rodada).
- **RLS**: ❌ não habilitada (ADR-0005 pendente) — isolamento é só de aplicação.

## Setup — semear uma org "rival" (owner diferente)
Banco local `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Script Node (`pg`):

```js
// _seed.mjs — cria user + org rival + member + material + customer + invitation
import pg from "pg"; import { randomUUID } from "node:crypto";
const c = new pg.Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
await c.connect();
const u=randomUUID(), a=randomUUID(), o=randomUUID(), m=randomUUID(), s=u.slice(0,8);
await c.query(`INSERT INTO public.users (id,auth_id,name,email) VALUES ($1,$2,'Foreign Owner',$3)`,[u,a,`foreign-${s}@example.com`]);
await c.query(`INSERT INTO public.organizations (id,name,slug) VALUES ($1,'Rival Studio',$2)`,[o,`rival-${s}`]);
await c.query(`INSERT INTO public.org_memberships (id,org_id,user_id,role) VALUES ($1,$2,$3,'owner')`,[m,o,u]);
await c.query(`INSERT INTO public.materials (org_id,name,minimum_quantity) VALUES ($1,'SECRET INK','5')`,[o]);
await c.query(`INSERT INTO public.customers (org_id,name) VALUES ($1,'Secret Client')`,[o]);
await c.query(`INSERT INTO public.org_invitations (id,org_id,invited_by,email,role) VALUES ($1,$2,$3,$4,'employee')`,[randomUUID(),o,u,`inv-${s}@x.com`]);
console.log(JSON.stringify({ orgId:o, memId:m })); await c.end();
```
> Cleanup ao final: `DELETE FROM public.organizations WHERE slug LIKE 'rival-%'` e
> `DELETE FROM public.users WHERE email LIKE 'foreign-%@example.com'` (cascata remove o resto).

## Matriz (token da Helena's Ink vs org rival)
Login em `POST /auth/sign-in` (seed user); `Authorization: Bearer <accessToken>`.

| Endpoint | Esperado | Resultado 2026-06-14 |
|---|---|---|
| `GET /orgs/:rival` | 404 | ✅ 404 |
| `PATCH /orgs/:rival` | 404 | ✅ 404 |
| `DELETE /orgs/:rival` | 404 | ✅ 404 |
| `GET /orgs/:rival/members` | 403 | ✅ 403 *(era 200 LEAK antes do fix)* |
| `POST /orgs/:rival/members/invite` | 404 | ✅ 404 |
| `PATCH /orgs/:rival/members/:id/role` | 403 | ✅ 403 |
| `DELETE /orgs/:rival/members/:id` | 403 | ✅ 403 |
| `GET /orgs/:rival/invitations` | 403 | ✅ 403 |
| `GET /orgs/:rival/materials` | 403 | ✅ 403 |
| `GET /orgs/:rival/customers` | 403 | ✅ 403 |
| `GET /orgs/:rival/materials` (POST/PATCH/DELETE) | 403 | ✅ 403 (guard cobre todos os métodos) |

**Regressão (própria org):** `GET /orgs/<helena>/members` → **200** (1 membro). ✅

## Observações
- A diferença de status (404 nas rotas de org via use-case vs 403 nas guardadas) é aceitável —
  ambos negam acesso. 404 ainda esconde a existência da org (melhor); considerar padronizar.
- **Pendência de segurança:** habilitar **RLS** para defesa em profundidade (finding 4 da revisão).
- Ao criar **novos** controllers org-scoped, aplicar **sempre** `OrgMembershipGuard` (ver `.memory/domain-rules.md`).
