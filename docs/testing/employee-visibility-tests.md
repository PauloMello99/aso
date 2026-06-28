# Visibilidade por funcionário — teste de 3 contas

> "Cada funcionário só vê o que é dele; o dono vê tudo e lança em nome de."
> Exercitado end-to-end via API contra o stack local (2026-06-22). Contas criadas na
> própria rodada (dono + funcionário A + funcionário B), todas via nossa API.

## Cenário

1. Dono `O` cria a org; convida `A` e `B` como `employee` (token próprio, accept).
2. `A` e `B` fazem lançamentos; valida-se a visibilidade por papel em cada módulo.

## Caixa / Transações

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| C1 | `A` cria transação; `B` cria transação | 201 (funcionário lança) | ✅ |
| C2 | `A` `GET /cashier/transactions` | só a de `A` (1) | ✅ |
| C3 | `B` `GET /cashier/transactions` | só a de `B` (1) | ✅ |
| C4 | Owner `GET /cashier/transactions` | todas (2) | ✅ |
| C5 | `A` `GET /cashier/balance` | saldo só dos lançamentos de `A` | ✅ 10000 |
| C6 | Owner `GET /cashier/balance` | saldo total da org | ✅ 30000 |
| C7 | Owner cria com `createdBy=A` (em nome de) | aparece na lista de `A` | ✅ A→2, saldo 15000 |
| C8 | `A` `POST .../reverse` | **403** (owner-only) | ✅ |
| C9 | `A` `POST .../transfers` | **403** | ✅ |
| C10 | `A` `PUT .../fees` | **403** | ✅ |
| C11 | `A` `POST .../categories` | **403** | ✅ |

## Agenda

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| AG1 | `A` cria evento; `B` cria evento | 201 | ✅ |
| AG2 | Owner cria evento com `assignedTo=A` (em nome de) | atribuído a `A` | ✅ |
| AG3 | `A` lista a agenda | só os seus (o próprio + o do owner p/ A) = 2 | ✅ |
| AG4 | `B` lista a agenda | só o seu = 1 | ✅ |
| AG5 | Owner lista a agenda | todos = 3 | ✅ |

## Serviços (já existente, revalidado)

| TC | Cenário | Esperado | Resultado |
|----|---------|----------|-----------|
| S1 | `A` cria serviço | 201 | ✅ |
| S2 | `A` lista serviços | só os de `A` = 1 | ✅ |
| S3 | `B` lista serviços | 0 (nenhum dele) | ✅ |
| S4 | Owner lista serviços | todos = 1 | ✅ |

## Notas de implementação

- Caixa: `CashierController` = `AuthGuard + OrgMembershipGuard`; `OrgOwnerGuard` por método
  em reverse/correct/transfer/`PUT fees`/`POST categories`. Scoping por
  `transactions.created_by` (= `users.id` app) via `resolveActor`/`resolveCreatedBy`.
- Agenda: `create-calendar-event` aceita `assignedTo` (owner; validado por
  `repo.isOrgMember`); listagem já escopava por `assigned_to`.
- Frontend: nav abre `Caixa` a todos; `CashierPage`/`TransactionForm`/`TransactionList`
  e `EventForm` escondem ações/seletores owner-only para funcionário (verificado no preview).
