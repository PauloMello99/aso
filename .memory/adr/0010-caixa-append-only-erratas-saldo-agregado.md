# ADR-0010 — Caixa: livro append-only com erratas e saldo por agregação

**Status:** Aceito
**Data:** 2026-06-16
**Origem:** Spec 07 (Caixa & Financeiro) + reunião 11/06/2026

## Contexto

O Caixa é o livro-caixa do estúdio (entradas/saídas, saldos). O legado guardava um
`amount` único e o **saldo corrente** (snapshot) por transação, em dois saldos (banco/caixa).
O legado **não é fonte de verdade**. Precisávamos: (1) refletir o **líquido** quando há taxa de
cartão; (2) permitir **correções** sem violar o caráter append-only das transações (já exigido
pela RLS de `0000`: membros só SELECT/INSERT); (3) calcular saldos de forma confiável.

## Decisão

1. **Append-only com erratas explícitas.** Nunca editar/excluir transação. Uma correção é um
   **estorno** (nova linha de tipo oposto com `reverses_transaction_id` → original). "Estornada"
   é **derivado** (existe uma linha que a estorna), nunca um campo mutável. "Corrigir" = estorno
   + relançamento, numa única ação (`correct-transaction.use-case`). Invariantes: não se estorna
   um estorno (422) nem se estorna duas vezes (409).

2. **Saldo por agregação on-read**, não snapshot por transação. Dois buckets — **dinheiro**
   (`cash`) e **digital** (`bank_transfer|credit_card|debit_card`); `credits` fica fora do caixa.
   Saldo = `SUM` do líquido com sinal; histórico diário = running sum em SQL (window). Mais
   simples e naturalmente correto com append-only; sem risco de snapshots dessincronizados.

3. **Split bruto/taxa/líquido** em `transactions`: `amount_gross_cents`, `fee_cents` e
   `amount_cents` (= **líquido**, o que o caixa reflete). A migration `0009` foi **aditiva** — a
   coluna legada `amount_cents` foi **repurposed como líquido** em vez de renomeada, para manter
   `drizzle-kit generate` **não-interativo** (renomes/drops disparam prompt que trava o harness).

4. **Taxas por org** (`org_payment_fees`, UNIQUE org+método, RLS owner-write): líquido =
   `gross - round(gross*percent/100 + fixed_cents)`, só em **entrada** com cartão. Config restrita
   a `owner`/`super_admin`. Cálculo isolado em `domain/fee-calculator.ts` (função pura), pronto
   para reuso pelo futuro módulo de Serviços.

## Consequências

- Histórico íntegro e auditável; nenhuma transação é destruída.
- Saldos sempre deriváveis do ledger; `transactions_org_transacted_idx` /
  `_org_method_idx` suportam a agregação. Se o volume crescer muito, dá para materializar
  cache por método sem mudar o contrato.
- A integração **Serviço→transação** (income automático com taxa) fica pendente do módulo de
  Serviços; o `fee-calculator` já a antecipa.

## Relacionado

- Clean Architecture (ADR-0006), RLS multi-tenant (ADR-0005), migrator custom (ADR-0003).
- `domain-rules.md` → "Caixa & Financeiro"; `docs/product/features/07-caixa-e-financeiro.md`.
