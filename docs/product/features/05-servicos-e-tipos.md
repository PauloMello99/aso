# 05 — Serviços & Tipos de Serviço · ✅ V1 entregue

> **Status (2026-06-21):** módulo backend (`modules/services/`) + feature frontend
> (`features/services/`) implementados. Decisões da V1: **form em Sheet lateral**;
> **cashback/créditos adiados** (métodos: dinheiro, transferência/Pix, cartão crédito/débito);
> **pago-ou-pendente + estorno** (cancelar gera errata na transação e devolve estoque;
> "registrar pagamento" converte pendente→pago); **tipos de serviço criados inline**;
> regra de materiais compartilháveis via checkbox **"acabou?"** (baixa 1 unidade).

## Visão
Registro de um atendimento realizado: cliente + profissional + valor + forma de pagamento +
materiais consumidos. É o **evento central** que conecta clientes, estoque e financeiro.

## Estado atual (ink-ops)
Schema existe (`services`, `service_types`, `service_materials` em `database/schema/studio`),
mas **não há módulo backend nem frontend** implementado. `service_types` é cadastro por org
(`UNIQUE(org_id, name)`).

## Legado a portar (ink-house-studio)
`services(customer_id, employee_id, created_by, body_part, amount, type, payment_type,
description)` + `service_materials(material_id, service_id, amount)`.
`type` e `payment_type` eram **enums fixos** (`tattoo|body_piercing`, `bank_transaction|cash|credits`).

**Fluxo de criação (legado — `createOneService`):**
1. Cliente existe e **enabled** (senão `CUSTOMER_DISABLED_ERROR`).
2. Profissional existe e **enabled** (`EMPLOYEE_DISABLED_ERROR`).
3. Se `payment_type='credits'` e `customer.credits < amount` → `NOT_ENOUGH_CREDITS_ERROR`.
4. Materiais existem; para cada, `stock >= usado` → senão `NOT_ENOUGH_STOCK_ERROR`.
5. Insere o serviço.
6. **Baixa estoque:** `amount = max(prev - usado, 0)`; grava `service_materials`.
7. Pagamento:
   - `credits` → deduz `credits` do cliente (sem transação financeira).
   - `cash`/`bank_transaction` → cria **transação income** atualizando `bank_balance`/`cash_balance`.
8. **Cashback:** `credits = max(round(credits + amount*0.1), 0)` (10% sempre creditados).

## Decisões das reuniões
- **Tipos de serviço configuráveis por org** (não enum fixo) — estúdios variados (microblading,
  piercing, etc.). Mesmo para origem de materiais/categorias.
- **Taxa de cartão → líquido no caixa** (ver spec 07): a transação gerada deve registrar o
  **valor líquido**, não o cheio.
- **Integração estoque ↔ serviço** para custo real / lucro líquido por procedimento (futuro,
  pesquisar).
- **Cashback** substitui créditos, **opcional por org** (a regra fixa de 10% do legado vira
  configurável/desligável — ver spec 07).

## Comportamento alvo (V1)
1. **Entidade `service`** (por org): `org_id, customer_id, employee_id, service_type_id,
   created_by, amount, payment_method, fee_amount?, net_amount?, description?,
   payment_transaction_id(null), created_at`.
   - **`body_part` removido (2026-06-21, migration 0016):** era específico de tatuagem; o
     sistema é genérico para abranger outros tipos de negócio. Detalhes vão em `description`.
2. **`service_type`**: cadastro por org (já no schema). `type` deixa de ser enum.
3. **Pagamento (`payment_method`)**: alinhar com `payment_method` enum do ink-ops
   (`cash, bank_transfer, credit_card, debit_card, credits`). Cartão calcula taxa (spec 07).
4. **Criação (caso de uso transacional)** — portar o encadeamento legado, multi-tenant e atômico:
   valida cliente/funcionário ativos da **mesma org** → valida estoque → cria serviço →
   baixa estoque via **stock_movements** (`type=service_consumption`, ver spec 06) →
   grava `service_materials` → cria **transação** (income, líquido) e vincula
   `service.payment_transaction_id` → aplica **cashback** se a org tiver a feature ligada.
5. **Relação serviço ↔ transação:** a transação é agnóstica; o **service** aponta para ela
   (`payment_transaction_id` FK nullable) — ver `.memory/domain-rules.md`.

## Regras de negócio
- Serviço sempre pertence a **uma org**; cliente, funcionário, tipo e materiais devem ser da mesma org.
- Pagamento em `credits` exige saldo suficiente (quando cashback/créditos estiver ativo).
- Estoque insuficiente bloqueia a criação.
- Transações nunca são editadas/deletadas (append-only).

## Pendências
- Definir se a baixa de estoque é **obrigatória** ou opcional por serviço.
- Modelo final de `payment_method` x cálculo de taxa (spec 07).
- Custo/lucro por procedimento (integração com custo de material) — pesquisar.

## Revisão das reuniões (04/06 · 11/06)
> Detalhe granular extraído das transcrições — ver
> [revisão por módulo §2](../reunioes/2026-revisao-funcionalidades-por-modulo.md#2-serviços).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

**Comportamento de form/UX**
- ✅ **Funcionário não vê o seletor de funcionário** no lançamento (lança só para si, forçado
  pelo use-case; vê só os próprios atendimentos). **Owner mantém** o seletor + filtro por membro.
- ✅ **Tela própria do serviço** — entregue como **Sheet lateral** com 3 seções
  (Dados · Materiais · Pagamento), consistente com o restante do app (decisão da sessão).
- ✅ **Filtro de período com default = mês vigente** (1º do mês → hoje), não "hoje − 30 dias".

**Campos que entraram**
- ✅ Método de pagamento **+Pix** (`bank_transfer`); **cartão crédito/débito**. (Créditos adiados.)
- ✅ **Data de execução** (`performed_at`) exibida na listagem (≠ `created_at`/auditoria).
- ✅ **Tipo de serviço configurável por org** (criável **inline** no form).

**Campos / features que saíram**
- ✅ Enum fixo `tattoo | body_piercing`.
- ✅ Seleção de funcionário no lançamento (para o papel funcionário).

**Regras**
- ✅ **Taxa de cartão → líquido no caixa** (reusa `computeNet` + `PAYMENT_FEE_REPOSITORY` do
  Caixa; ex.: R$1.000 no crédito 10% → R$900 líquido). Freelancer com máquina própria fora da V1.
- ✅ **Consumo de materiais** no lançamento (debita estoque via `stock_movements`
  `service_consumption`); **"acabou?"** para materiais `shareable` (baixa 1 unidade). A edição
  cobre só campos não-financeiros; alterar materiais/valor = cancelar (estorno + devolução) e recriar.
