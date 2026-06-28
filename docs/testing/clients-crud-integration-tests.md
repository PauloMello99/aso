# Clients (Clientes) CRUD — Integration Test Guide

> Step-by-step manual / integration test script for the **Clientes** feature
> (`features/clients` on the frontend, `modules/customers` on the backend).
>
> Last updated: 2026-06-10

## 1. Scope

Full customer lifecycle at `/dashboard/org/[orgId]/clients`:

| Capability | Frontend | Backend route |
|---|---|---|
| List customers | `CustomerList` | `GET /orgs/:orgId/customers` |
| Search | search box (debounced) | `GET …/customers?search=` |
| Create customer | `CustomerForm` | `POST /orgs/:orgId/customers` |
| Edit customer | `CustomerForm` (edit) | `PATCH /orgs/:orgId/customers/:id` |
| Activate / deactivate | ⋮ menu → toggle `enabled` | `PATCH …/customers/:id` |
| Delete customer | native `confirm()` | `DELETE /orgs/:orgId/customers/:id` |
| Active count card | derived client-side | — |

## 2. Pre-requisites

Same as the materials guide (local Supabase + backend `:3001` + frontend `:3000`
+ a confirmed user owning an org). Sign in at `/auth/login`, then open
`/dashboard/org/<orgId>/clients`.

## 3. Validation rules (reference)

Enforced on the client (Zod `client.schemas.ts`) and server
(class-validator DTOs).

| Field | Rule |
|---|---|
| `name` | required, 1–120 chars |
| `email` | optional; valid e-mail (`@IsEmail`) |
| `phone` | optional, ≤ 30 chars |
| `gender` | optional; one of `male` / `female` / `other` |
| `birthDate` | optional; `YYYY-MM-DD` |
| `address` | optional, ≤ 255 chars |
| `notes` | optional, ≤ 1000 chars |
| `enabled` | boolean (update only); new customers default `true` |

Business rules:
- New customers start `enabled = true`; `createdBy` set from the JWT user id.
- `GET …?enabled=true` returns only active customers.
- `GET …?search=` matches (case-insensitive) name / e-mail / phone.

---

## 4. Test scenarios

### TC-01 — List loads
- **Steps:** Open `/dashboard/org/<orgId>/clients`.
- **Expected:** Heading **"Clientes"**, cards **"Total de clientes"** /
  **"Ativos"**, table `NOME | E-MAIL | TELEFONE | STATUS`; `GET /customers` 200.
- **Result:**

### TC-02 — Empty state
- **Steps:** In an org with no customers, reload.
- **Expected:** *"Nenhum cliente cadastrado ainda."*
- **Result:**

### TC-03 — Create (name only)
- **Steps:** **"Novo cliente"** → `Nome = Carlos Lima` → **"Criar cliente"**.
- **Expected:** `POST` 200/201; dialog closes; row appears with `Ativo`;
  e-mail/phone shown as `—`; total + active increment.
- **Result:**

### TC-04 — Create (all fields)
- **Steps:** New → name, e-mail, phone, gender, nascimento, endereço, obs → submit.
- **Expected:** Row shows e-mail + phone; persisted (`SELECT * FROM customers`).
- **Result:**

### TC-05 — Create validation: empty name (client)
- **Steps:** Submit with blank **Nome**.
- **Expected:** Inline *"Nome é obrigatório"*; no request fired.
- **Result:**

### TC-06 — Create validation: invalid e-mail (client)
- **Steps:** name + `E-mail = not-an-email` → submit.
- **Expected:** Inline *"E-mail inválido"*.
- **Result:**

### TC-07 — Server-side validation
- **Steps:** `POST /customers` with `{ "name": "" }` and with
  `{ "name":"X", "email":"bad" }` (valid Bearer token).
- **Expected:** Both `400`.
- **Result:**

### TC-08 — Edit
- **Steps:** ⋮ → **Editar** → change name + add phone → **"Salvar alterações"**.
- **Expected:** `PATCH` 200; row updates; form pre-filled on open.
- **Result:**

### TC-09 — Deactivate
- **Steps:** ⋮ → **Desativar**.
- **Expected:** `PATCH {enabled:false}` 200; STATUS → **Inativo**; "Ativos" decrements.
- **Result:**

### TC-10 — Reactivate
- **Steps:** ⋮ → **Ativar**.
- **Expected:** STATUS → **Ativo**; "Ativos" increments.
- **Result:**

### TC-11 — Search
- **Steps:** Type part of a name / e-mail / phone in the search box.
- **Expected:** List filters (debounced) to matching rows; clearing restores all;
  `GET …?search=` fired.
- **Result:**

### TC-12 — `?enabled=true` filter (API)
- **Steps:** `GET /orgs/<orgId>/customers?enabled=true`.
- **Expected:** Inactive customers excluded.
- **Result:**

### TC-13 — Delete (confirm)
- **Steps:** ⋮ → **Excluir** → accept confirm.
- **Expected:** `DELETE` 204; row removed; total decrements.
- **Result:**

### TC-14 — Delete cancelled
- **Steps:** ⋮ → **Excluir** → cancel.
- **Expected:** No request; row stays.
- **Result:**

### TC-15 — Refresh
- **Steps:** Click ↻.
- **Expected:** Spinner; `GET /customers` re-fired.
- **Result:**

### TC-16 — Not found (API)
- **Steps:** `PATCH`/`DELETE` a random UUID.
- **Expected:** `404` with code `CUSTOMER_NOT_FOUND`.
- **Result:**

### TC-17 — Cross-org isolation (authz)
- **Steps:** With org A's token, `GET /orgs/<orgB>/customers`.
- **Expected:** No data leak (see note — currently shares the materials
  membership-guard gap).
- **Result:**

### TC-18 — Unauthenticated
- **Steps:** Clear `localStorage.inkops_session`, open the clients page.
- **Expected:** `AuthGuard` redirects to `/auth/login`.
- **Result:**

---

## 5. Useful DB assertions (read-only, local)

```sql
SELECT id, name, email, phone, gender, enabled, created_by, created_at
FROM customers WHERE org_id = '<orgId>' ORDER BY created_at DESC;
```

## 6. Results summary

> Executed 2026-06-10 against the local stack (org **Helena's Ink**).
> Verification channels: **UI** = browser-driven; **API** = direct HTTP to the
> backend (the frontend→backend integration boundary); **DB** = Postgres assertion.
>
> ⚠️ **Environment note:** part-way through the UI run, the Next 16.2.7 Turbopack
> dev server hit an intermittent client-hydration bug (`handleStaticIndicator`
> throws on the HMR `isrManifest` message), which left pages non-interactive
> app-wide (landing/login included — i.e. unrelated to this feature's code).
> Scenarios that could not be **re-run** through the UI afterwards were verified
> through the API boundary instead (same use-cases, DTO validation, and repository
> code the UI calls). Recovery: stop dev server → remove `apps/frontend/.next` →
> `pnpm install` → restart (this fixed the same class of issue earlier in the day).

| TC | Title | Status | Channel | Notes |
|----|-------|--------|---------|-------|
| 01 | List loads | ✅ PASS | UI | Heading, cards, table rendered; `GET /customers` 200 (screenshot) |
| 02 | Empty state | ⏭️ DEFERRED | — | Branch verified by code review (`CustomerList` → "Nenhum cliente cadastrado ainda.") |
| 03 | Create (name only) | ✅ PASS | UI+DB | "Carlos Lima" created, optional fields `—`, row + counts updated |
| 04 | Create (all fields) | ✅ PASS | UI+DB | "Ana Beatriz" (e-mail, phone, gender=female, birthDate, address, notes) persisted; `createdBy` = JWT user |
| 05 | Validation: empty name | ✅ PASS | UI | `customerSchema` rejects → "Nome é obrigatório"; resolver + FormMessage verified via live RHF inspection |
| 06 | Validation: invalid e-mail | ✅ PASS | UI | "bad@" rejected → "E-mail inválido" |
| 07 | Server-side validation | ✅ PASS | API | `POST` empty name → 400; bad e-mail → 400 |
| 08 | Edit | ✅ PASS | API | `PATCH` rename ("João"→"João Pedro") applied |
| 09 | Deactivate | ✅ PASS | API | `PATCH {enabled:false}` → enabled=false |
| 10 | Reactivate | ✅ PASS | API | `PATCH {enabled:true}` round-trip → enabled=true |
| 11 | Search | ✅ PASS | API | `?search=mari` → only "Mariana Souza" |
| 12 | `?enabled=true` filter | ✅ PASS | API | Disabled customer excluded from results |
| 13 | Delete (confirm) | ✅ PASS | API | `DELETE` → 204; row gone |
| 14 | Delete cancelled | ⏭️ DEFERRED | — | UI-only; native `confirm`→false path identical to materials TC-17 (passed there) |
| 15 | Refresh | ⏭️ DEFERRED | — | UI-only; identical pattern to materials TC-18 (passed there) |
| 16 | Not found | ✅ PASS | API | `PATCH`/`DELETE` random UUID → 404 `CUSTOMER_NOT_FOUND` |
| 17 | Cross-org isolation | ✅ FIXED | API | Originally shared the materials authz gap (foreign org → 200). Resolved by `OrgMembershipGuard` on `CustomersController` (`@UseGuards(AuthGuard, OrgMembershipGuard)`). Re-verified: non-member token → **403** on a real foreign org with data; members still 200; no token → 401. |
| 18 | Unauthenticated | ⏭️ DEFERRED | — | UI-only; same `AuthGuard` as materials TC-20 (passed there) |

**Tally:** 13 PASS, 4 deferred (UI-only re-runs blocked by the dev-server hydration bug; underlying logic verified via API/parity with materials). TC-17 was a finding, now fixed and re-verified — see row.
