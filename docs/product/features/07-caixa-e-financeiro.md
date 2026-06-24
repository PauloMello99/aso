# 07 — Caixa & Financeiro (Transações) · ✅ Implementado (V1)

## Visão
Livro-caixa do estúdio: entradas e saídas, saldos e movimentação. Alimenta dashboard e
relatórios financeiros.

## Estado atual (ink-ops) — implementado 2026-06-16
Módulo `modules/cashier/**` (Clean Architecture, espelha materials) + feature
`features/cashier/**` no frontend. Migration **`0009`**.

- **Split bruto/taxa/líquido** em `transactions`: `amount_gross_cents`, `fee_cents` e
  `amount_cents` (= **líquido**, o que o caixa reflete). O split foi **aditivo** (a coluna
  `amount_cents` legada virou o líquido) para manter o `drizzle-kit generate` não-interativo.
- **Append-only com errata:** nunca se edita/exclui. **Estorno** = nova transação de tipo
  oposto com `reverses_transaction_id` → original. "Estornada" é **derivado** (existe linha que
  a estorna). **Corrigir** = estorno + relançamento (use-case `correct-transaction`).
- **Saldos por agregação on-read**: dois buckets — **dinheiro** (`cash`) e **digital**
  (`bank_transfer|credit_card|debit_card`); `credits` fora do caixa. `GET /balance` e
  `GET /balance/history` (running sum por dia, porta o `balance_history_per_month`).
- **Taxas por org** (`org_payment_fees`, RLS owner-write): `GET/PUT /orgs/:orgId/cashier/fees`,
  só `owner`/`super_admin`. Líquido = `gross - round(gross*percent/100 + fixed_cents)`, só em
  **entrada** com método de cartão (helper puro `domain/fee-calculator.ts`).
- **Pendente:** integração **Serviço→transação** (income automático) — depende do módulo de
  Serviços (inexistente). O `fee-calculator` já está pronto para reuso.

**Domain rule (mantida):** transações são **append-only e agnósticas**; é o **service** que
aponta para a transação via `payment_transaction_id` (FK nullable).

## Legado a portar (ink-house-studio)
`transactions(description, type income|outcome, amount, payment_type bank_transaction|cash|credits,
bank_balance, cash_balance)`. Cada linha guarda o **saldo corrente** de **banco** e **caixa**
(dois saldos separados). Saldo novo = saldo da última transação ± amount conforme `payment_type`.
Função SQL `balance_history_per_month(start,end)` retorna o **último saldo de cada dia** (para o
gráfico do dashboard). Transações geradas por serviços (income) e manuais (income/outcome).

## Decisões das reuniões (11/06)
- **Taxa de cartão (problema):** registrar o valor cheio distorce o caixa (ex.: R$ 1.000, taxa
  10% → recebido R$ 900).
- **Solução:** cada org configura sua taxa — **percentual**, **valor fixo** ou **combinação**
  (ex.: `10%`; `5% + R$ 0,50`). Ao lançar serviço em **cartão**, o sistema calcula a taxa e
  registra o **valor líquido** no caixa. Configuração **exclusiva de administradores**.

## Comportamento alvo (V1)
1. **Transação** (por org, append-only): `org_id, description, type, amount_gross, fee_amount,
   amount_net, payment_method, created_by, created_at`. O **caixa reflete `amount_net`**.
2. **Saldos:** dois saldos lógicos — **dinheiro** e **banco/digital** (cartão/transferência/pix).
   Manter o padrão legado de **saldo corrente** (snapshot por transação) **ou** calcular por
   agregação. Recomenda-se um campo de saldo materializado por método para performance, derivado
   de forma atômica na criação.
3. **Configuração de taxas (por org, só admin):** `org_payment_fees` —
   `org_id, method(credit_card|debit_card|...), percent, fixed_amount`. Combinação = `percent`
   sobre o bruto **+** `fixed_amount`. Líquido = `gross - (gross*percent + fixed)`.
4. **Origem das transações:**
   - **Serviço pago** (cash/cartão/transfer) → income automático (spec 05), já com líquido.
   - **Lançamento manual** → income/outcome (compras, despesas, ajustes).
   - Pagamento em **créditos/cashback** → **não** gera transação financeira (é saldo do cliente).
5. **Custos operacionais** (saídas) entram como `outcome` — base para relatório financeiro e
   cálculo de lucro (com custo de material — spec 06).

## Regras de negócio
- **Append-only:** nunca editar/excluir transação; correções entram como nova transação.
- Taxa só se aplica a métodos de cartão; `cash`/`bank_transfer`/`pix` conforme configuração.
- Apenas `owner`/`super_admin` configuram taxas.
- Tudo isolado por `org_id`.

## Pendências
- Confirmar **modelo de saldo** (snapshot por transação vs agregação vs cache materializado).
- Definir os **métodos** que sofrem taxa e a unidade do `fixed_amount` (centavos).
- Portar a função de **histórico de saldo** para o dashboard (spec 10).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §7](../reunioes/2026-revisao-funcionalidades-por-modulo.md#7-caixa--transações).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **Errata no lugar de editar/excluir** (append-only): correção é uma nova transação cuja
  diferença o sistema calcula (ex.: "−27 deveria ser −10" → lança a diferença). Melhor para
  auditoria. **Saiu** a edição/exclusão direta.
- ✅ **Data da transação** retroativa (≠ data de registro); **conceito de registro/gestão, não
  espelhamento** de banco ("caixa" pode ser renomeado).
- ⏳ **Botão de transferência** entre meios (dinheiro → banco) — mesma premissa da errata, evita
  vai-e-vem e erro de valor.
- ⏳ **Categoria de transação** pré-definida + criável (pagamento de funcionário, material, conta,
  reforma…) para padronizar e alimentar relatórios; **o campo descrição permanece** (detalhe).
- ⏳ **Caixa poupança / reserva** (mais um "caixa") — discutido, **em stand-by**.
