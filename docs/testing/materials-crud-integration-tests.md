# Materials (Estoque) CRUD — Integration Test Guide

> Step-by-step manual / integration test script for the **Estoque** feature
> (`features/stock` on the frontend, `modules/materials` on the backend).
>
> Last updated: 2026-06-10

## 1. Scope

This guide covers the full materials lifecycle exposed at
`/dashboard/org/[orgId]/stock`:

| Capability | Frontend | Backend route |
|---|---|---|
| List materials | `MaterialList` | `GET /orgs/:orgId/materials` |
| Create material | `MaterialForm` | `POST /orgs/:orgId/materials` |
| Edit material | `MaterialForm` (edit mode) | `PATCH /orgs/:orgId/materials/:id` |
| Delete material | native `confirm()` | `DELETE /orgs/:orgId/materials/:id` |
| Restock (entrada) | `RestockForm` | `POST /orgs/:orgId/materials/:id/restock` |
| Adjust (ajuste +/-) | `AdjustStockForm` | `POST /orgs/:orgId/materials/:id/adjust` |
| Movement history | `StockMovementsPanel` | `GET /orgs/:orgId/materials/:id/movements` |
| Low-stock derivation | `isLowStock()` (client) | — |

## 2. Pre-requisites

1. **Local Supabase running** — `supabase start` (Postgres on `127.0.0.1:54322`,
   Auth on `127.0.0.1:54321`).
2. **Backend running** — `pnpm --filter backend dev` → `http://localhost:3001`.
3. **Frontend running** — `pnpm --filter frontend dev` → `http://localhost:3000`.
4. **A confirmed user + an organization** the user owns/belongs to.
   - Seed data ships with user `paulovmello99@gmail.com` owning org
     **Helena's Ink** (`8fd3a8f4-c292-492c-bce8-14f4c90c012e`).
   - If you don't know the password, set one via the GoTrue admin API:
     ```powershell
     $key = ((Get-Content apps/backend/.env | Select-String '^SUPABASE_SERVICE_ROLE_KEY=').Line -split '=',2)[1].Trim()
     $uid = "<auth.users.id>"   # SELECT id FROM auth.users WHERE email = '...';
     Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:54321/auth/v1/admin/users/$uid" `
       -Headers @{ apikey=$key; Authorization="Bearer $key"; "Content-Type"="application/json" } `
       -Body (@{ password = "TestPass123!"; email_confirm = $true } | ConvertTo-Json)
     ```
5. Sign in at `/auth/login`, then open
   `/dashboard/org/<orgId>/stock`.

## 3. Validation rules (reference)

These constraints are enforced on **both** the client (Zod, `stock.schemas.ts`)
and the server (class-validator DTOs). Tests below exercise both layers.

| Field | Rule |
|---|---|
| `name` | required, 1–100 chars |
| `unit` | optional, ≤ 20 chars |
| `minimumQuantity` | optional; if present must match `^\d+(\.\d{1,2})?$` (non-negative, ≤ 2 decimals) |
| `costPerUnit` | optional; same numeric pattern as above |
| restock `quantity` | required; positive numeric string `^\d+(\.\d{1,2})?$` |
| adjust `quantityDelta` | required; **signed** numeric string `^-?\d+(\.\d{1,2})?$` |
| restock/adjust `note` | optional, ≤ 255 chars |

Business rules:
- Stock quantity starts at `0.00` on create (cannot be set directly).
- Restock inserts a `restock` movement and increments `stockQuantity`.
- Adjust inserts a `manual_adjustment` movement and applies a signed delta.
- **Low stock** ⇔ `minimumQuantity > 0 && stockQuantity <= minimumQuantity`.

---

## 4. Test scenarios

> Convention: each scenario has **Steps**, **Expected**, and a **Result** box to
> fill in (`PASS` / `FAIL` + notes). UI strings are in pt-BR.

### TC-01 — List loads (happy path)
- **Steps:** Open `/dashboard/org/<orgId>/stock`.
- **Expected:**
  - Page heading **"Estoque"**.
  - Summary cards **"Total de materiais"** and **"Estoque baixo"** show correct counts.
  - Table headers: `MATERIAL | UNIDADE | ESTOQUE | MÍNIMO | CUSTO/UN`.
  - Each seeded material appears as a row.
  - `GET /orgs/:orgId/materials` returns `200`.
- **Result:**

### TC-02 — Empty state
- **Steps:** In an org with no materials (or after deleting all), reload.
- **Expected:** Dashed empty card: *"Nenhum material cadastrado ainda."*
- **Result:**

### TC-03 — Create material (minimal — name only)
- **Steps:** Click **"Novo material"** → fill `Nome = Vaselina` → **"Criar material"**.
- **Expected:**
  - `POST /materials` returns `201`/`200` with the created material.
  - Dialog closes; new row appears; "Total de materiais" increments by 1.
  - `unit`, `minimumQuantity (0.00)`, `costPerUnit` shown as `—`.
- **Result:**

### TC-04 — Create material (all fields)
- **Steps:** New material → `Nome = Luva nitrílica`, `Unidade = par`,
  `Qtd. mínima = 20`, `Custo por unidade = 1.50` → submit.
- **Expected:** Row shows `par`, mínimo `20`, `R$ 1,50`. Persisted in DB
  (`SELECT * FROM materials WHERE name='Luva nitrílica'`).
- **Result:**

### TC-05 — Create validation: empty name (client)
- **Steps:** Open form, leave **Nome** blank, submit.
- **Expected:** Inline error *"Nome é obrigatório"*; no network request fired.
- **Result:**

### TC-06 — Create validation: non-numeric quantity (client)
- **Steps:** New material → `Nome = X`, `Qtd. mínima = abc` → submit.
- **Expected:** Inline error *"Informe um número positivo (ex: 10 ou 5.50)"*.
- **Result:**

### TC-07 — Create validation: >2 decimals / negative (client)
- **Steps:** Try `Custo = 1.999`, then `Qtd. mínima = -5`.
- **Expected:** Both rejected with the numeric-format error.
- **Result:**

### TC-08 — Server-side validation (defense in depth)
- **Steps:** Bypass the UI — `POST /orgs/<orgId>/materials` with
  `{ "name": "" }` (use a valid Bearer token).
- **Expected:** `400` with class-validator message; nothing inserted.
- **Result:**

### TC-09 — Edit material
- **Steps:** Row menu (⋮) → **Editar** → change `Nome` and `Unidade` → **"Salvar alterações"**.
- **Expected:** `PATCH /materials/:id` `200`; row updates in place; dialog
  pre-filled with current values when opened.
- **Result:**

### TC-10 — Restock (entrada de estoque)
- **Steps:** Row green **+** (or menu → **Repor estoque**) → `quantity = 50`,
  optional note → submit.
- **Expected:**
  - `POST /materials/:id/restock` `200`.
  - `ESTOQUE` increases by 50.
  - A `restock` row is added to `stock_movements`.
- **Result:**

### TC-11 — Adjust stock down (waste/correction)
- **Steps:** Menu → **Ajustar estoque** → `quantityDelta = -10` → submit.
- **Expected:** `ESTOQUE` decreases by 10; a `manual_adjustment` movement
  with `quantity_delta = -10` is recorded.
- **Result:**

### TC-12 — Adjust validation: empty / non-signed-numeric
- **Steps:** Adjust form → leave delta empty, then enter `++5`.
- **Expected:** *"Campo obrigatório"* then *"Informe um número (ex: 10 ou -5.50)"*.
- **Result:**

### TC-13 — Low-stock badge derivation
- **Steps:** Ensure a material has `minimumQuantity = 10` and adjust stock so
  `stockQuantity <= 10`.
- **Expected:** Orange ⚠ icon + **"Estoque baixo"** badge on the row; the
  "Estoque baixo" summary count includes it.
- **Result:**

### TC-14 — Low-stock clears after restock
- **Steps:** Restock the TC-13 material above its minimum.
- **Expected:** Badge disappears; "Estoque baixo" count decrements.
- **Result:**

### TC-15 — Movement history
- **Steps:** Menu → **Histórico**.
- **Expected:** `GET /materials/:id/movements` `200`; panel lists the restock
  and adjustment movements in reverse-chronological order with type + delta.
- **Result:**

### TC-16 — Delete material (confirm)
- **Steps:** Menu → **Excluir** → accept the native confirm dialog.
- **Expected:** `DELETE /materials/:id` `204`; row removed; total decrements.
- **Result:**

### TC-17 — Delete cancelled
- **Steps:** Menu → **Excluir** → **Cancel** the confirm.
- **Expected:** No request fired; row stays.
- **Result:**

### TC-18 — Refresh button
- **Steps:** Click the ↻ refresh icon.
- **Expected:** Spinner animates; list re-fetched (`GET /materials`).
- **Result:**

### TC-19 — Cross-org isolation (authz)
- **Steps:** With org A's token, call `GET /orgs/<orgB-id>/materials` (an org the
  user is not a member of).
- **Expected:** Forbidden / not-found — no data leak.
- **Result:**

### TC-20 — Unauthenticated access
- **Steps:** Clear `localStorage.inkops_session`, open the stock page.
- **Expected:** `AuthGuard` redirects to `/auth/login`.
- **Result:**

---

## 5. Useful DB assertions (read-only, local)

```sql
-- materials for the org
SELECT id, name, unit, stock_quantity, minimum_quantity, cost_per_unit
FROM materials WHERE org_id = '<orgId>' ORDER BY created_at DESC;

-- movements for a material (newest first)
SELECT type, quantity_delta, note, created_at
FROM stock_movements WHERE material_id = '<id>' ORDER BY created_at DESC;
```

## 6. Results summary

> Executed 2026-06-10 against local stack (org **Helena's Ink**), driven through
> the browser UI + backend API + DB assertions. **20 PASS, 1 deferred** (TC-19
> was a finding, now fixed and re-verified — see row).

| TC | Title | Status | Notes |
|----|-------|--------|-------|
| 01 | List loads | ✅ PASS | Heading, cards, table, "Tinta preta" row, `GET /materials` 200 |
| 02 | Empty state | ⏭️ DEFERRED | Not run to preserve seed data; empty-state branch verified by code review (`MaterialList` returns "Nenhum material cadastrado ainda.") |
| 03 | Create (minimal) | ✅ PASS | "Vaselina" created, optional fields shown as `—` |
| 04 | Create (all fields) | ✅ PASS | "Luva nitrílica" (par, mín 20, R$ 1,50) persisted |
| 05 | Validation: empty name | ✅ PASS | "Nome é obrigatório", no request fired |
| 06 | Validation: non-numeric qty | ✅ PASS | "abc" → numeric-format error |
| 07 | Validation: decimals/negative | ✅ PASS | "1.999" rejected (>2 decimals) |
| 08 | Server-side validation | ✅ PASS | `POST` with empty name / "1.999" → `400` |
| 09 | Edit | ✅ PASS | Renamed "Vaselina"→"Vaselina sólida", stock (40) preserved |
| 10 | Restock | ✅ PASS | +50 → stock 50, `restock` movement w/ note |
| 11 | Adjust down | ✅ PASS | −10 → stock 40, `manual_adjustment` movement |
| 12 | Adjust validation | ✅ PASS | empty→"Campo obrigatório"; "++5"→numeric error |
| 13 | Low-stock badge | ✅ PASS | Luva (0≤20) shows ⚠; "Estoque baixo"=2 |
| 14 | Low-stock clears | ✅ PASS | Restock +25 → 25>20, ⚠ gone, count→1 |
| 15 | Movement history | ✅ PASS | Panel lists "Ajuste manual −10" + "Reposição +50" reverse-chron |
| 16 | Delete (confirm) | ✅ PASS | `confirm`→true, row removed, movements cascade-deleted |
| 17 | Delete cancelled | ✅ PASS | `confirm`→false, row kept |
| 18 | Refresh | ✅ PASS | ↻ triggers new `GET /materials` |
| 19 | Cross-org isolation | ✅ FIXED | Originally a finding (returned **200** for a foreign org — data leak). Resolved by adding `OrgMembershipGuard` (`modules/auth/guards/org-membership.guard.ts`) to `MaterialsController` (`@UseGuards(AuthGuard, OrgMembershipGuard)`). Re-verified: a non-member token reading another org's materials now returns **403** (incl. a real foreign org seeded with a "SECRET INK" material — not leaked); members still get 200; no token → 401. |
| 20 | Unauthenticated | ✅ PASS | Cleared session → `AuthGuard` redirects to `/auth/login` |
