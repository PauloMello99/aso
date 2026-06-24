# Clients (Customers) CRUD — Development Plan

> Plan for implementing the **Clientes** feature, mirroring the existing
> **Estoque / materials** CRUD. Created 2026-06-10.

## Context & conventions

- **Domain name:** `customer` (DB table `customers` already exists and is empty).
- **UI name:** "Clientes". Following the existing precedent where the frontend
  feature `stock` talks to the backend `materials` domain, the frontend feature
  folder is **`clients`** (UI concept) and the backend module is **`customers`**
  (domain). API resource: `/orgs/:orgId/customers`.
- Backend = NestJS Clean Architecture (domain / application / infrastructure /
  interface), repository pattern with `Symbol` tokens, domain exceptions
  (ADR-0006). Mirrors `modules/materials` 1:1.
- Frontend = Feature-Based Architecture (ADR-0007), React Query hooks,
  shadcn dialogs, **mobile-first** (cards on mobile, table on `sm+`, `p-4 sm:p-6`).
- No DB migration needed — `customers` table exists. Columns:
  `id, org_id, user_id, origin_id, created_by, name(notNull), email, phone,
  birth_date(date), gender(enum male|female|other), address, notes,
  enabled(bool, default true), created_at, updated_at`.

## Known caveat (inherited)

The materials endpoints lack an org-membership guard (only `AuthGuard`). To stay
consistent with the existing codebase, the customers module mirrors that same
pattern. The membership-guard gap is tracked as a **separate** task and, when
fixed, should cover all org-scoped resource controllers (materials + customers).

---

## Backend — `apps/backend/src/modules/customers/`

| File | Mirror of | Purpose |
|---|---|---|
| `domain/customer.entity.ts` | `material.entity.ts` | `CustomerEntity`, `CreateCustomerData`, `UpdateCustomerData`, `Gender` type |
| `domain/customer.repository.interface.ts` | `material.repository.interface.ts` | `CUSTOMER_REPOSITORY` symbol + `ICustomerRepository` (`findById`, `findAllByOrg(filter)`, `create`, `update`, `delete`) + `ListCustomersFilter` (`search?`, `enabledOnly?`) |
| `domain/exceptions/customer-not-found.exception.ts` | `material-not-found.exception.ts` | code `CUSTOMER_NOT_FOUND` |
| `application/use-cases/list-customers.use-case.ts` | `list-materials` | list by org + filter |
| `application/use-cases/create-customer.use-case.ts` | `create-material` | create |
| `application/use-cases/update-customer.use-case.ts` | `update-material` | find-or-404 then update |
| `application/use-cases/delete-customer.use-case.ts` | `delete-material` | find-or-404 then delete |
| `infrastructure/persistence/customer.mapper.ts` | `material.mapper.ts` | row → entity (dates: `birthDate` is `date` string) |
| `infrastructure/persistence/drizzle-customer.repository.ts` | `drizzle-material.repository.ts` | Drizzle impl; `search` → `ilike` on name/email; order by name |
| `infrastructure/customers-infrastructure.module.ts` | `materials-infrastructure.module.ts` | bind `CUSTOMER_REPOSITORY` |
| `interface/dto/create-customer.dto.ts` | `create-material.dto.ts` | validation (below) |
| `interface/dto/update-customer.dto.ts` | `update-material.dto.ts` | partial |
| `interface/customers.controller.ts` | `materials.controller.ts` | `@Controller("orgs/:orgId/customers")`, `AuthGuard`; `GET` (with `?search`, `?enabled`), `POST`, `PATCH :id`, `DELETE :id` (204), `CurrentUser` → `createdBy` on create |
| `customers.module.ts` | `materials.module.ts` | wire controller + use-cases + infra + AuthModule |

Wiring edits:
- `common/filters/domain-exception.filter.ts` → add `CUSTOMER_NOT_FOUND: NOT_FOUND`.
- `app.module.ts` → register `CustomersModule`.

### DTO validation rules

| Field | Rule |
|---|---|
| `name` | required, non-empty string (create); optional min-1 on update |
| `email` | optional, `@IsEmail` (nullable) |
| `phone` | optional string (nullable) |
| `birthDate` | optional `YYYY-MM-DD` (`@Matches(/^\d{4}-\d{2}-\d{2}$/)`) (nullable) |
| `gender` | optional `@IsIn(["male","female","other"])` (nullable) |
| `address` | optional string (nullable) |
| `notes` | optional string (nullable) |
| `enabled` | optional boolean (update only) |

---

## Frontend — `apps/frontend/src/features/clients/`

| File | Mirror of | Purpose |
|---|---|---|
| `types/index.ts` | `stock/types` | `Customer`, `Gender`, `CustomersFilter` |
| `schemas/client.schemas.ts` | `stock.schemas.ts` | Zod `customerSchema` matching DTO rules |
| `hooks/use-customers.ts` | `use-materials.ts` | RQ query + create/update/delete mutations → `/orgs/:orgId/customers` |
| `components/customer-form.tsx` | `material-form.tsx` | dialog: name*, email, phone, gender (select), birthDate (date), address, notes |
| `components/customer-list.tsx` | `material-list.tsx` | mobile cards + desktop table; ⋮ menu (Editar, Excluir); inactive badge |
| `components/clients-page.tsx` | `stock-page.tsx` | header, summary cards (Total / Ativos), search box, list, dialogs, `confirm()` delete |
| `index.ts` | `stock/index.ts` | export `ClientsPage` |

Wiring edits:
- `infrastructure/query/query-keys.ts` → add `customers` key factory
  (`all(orgId)`, `list(orgId, filter)`).
- `pages/dashboard/org/[orgId]/clients.tsx` → replace placeholder with
  `<ClientsPage orgId={orgId} />` (same shape as `stock.tsx`).

Components reused from `shared/components/ui`: `dialog`, `form`, `input`,
`button`, `select` (verify a `select` exists; if not, use a native `<select>`
styled, or add the shadcn one).

---

## Step order (execution)

1. Backend domain (entity, repo interface, exception).
2. Backend application (4 use-cases).
3. Backend infrastructure (mapper, drizzle repo, infra module).
4. Backend interface (DTOs, controller) + module + filter + app.module wiring.
5. Restart backend, smoke-test the 5 routes with `curl`/Invoke-RestMethod.
6. Frontend types + schema + query-keys.
7. Frontend hook.
8. Frontend components (form, list, page) + index.
9. Wire `clients.tsx` page.
10. `pnpm --filter backend check-types` + `--filter frontend check-types`.
11. Verify in browser; then item 7 (integration tests + doc).

## Out of scope (deferred)

- `origin_id` (customer origins) selection — no origins seeded; leave null.
- `user_id` (customer portal link) — reserved for the future.
- Customer detail page / history / anamnese — only list-level CRUD here.
- Org-membership guard — tracked separately.
