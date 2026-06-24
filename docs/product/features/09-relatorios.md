# 09 — Relatórios · 🆕 Novo

## Visão
Camada consolidada de análise. **Não é uma única tela** — vários relatórios especializados.

## Estado atual (ink-ops)
Inexistente. Dados existem (serviços, transações, clientes, materiais) mas sem agregação.

## Legado a portar
Apenas gráficos pontuais (saldo, contadores) — sem módulo de relatórios. A função
`balance_history_per_month` é o embrião do relatório financeiro.

## Decisões das reuniões (11/06)
Indicadores hoje são implícitos; falta consolidação. Relatórios segmentados:
- **Serviços:** por período / funcionário / cliente, receita, ticket médio.
- **Funcionários:** quem mais faturou, mais atendeu, evolução de performance.
- **Clientes:** recorrentes, inativos, **origem**, conversão por canal de aquisição.
- **Financeiros:** movimentação de caixa, entradas, saídas, custos, taxas.

> A equipe definiu que **relatórios exigem levantamento de requisitos próprio** antes de
> desenvolver — este doc é o ponto de partida, não a especificação final.

## Comportamento alvo (V1 — direcional)
1. Filtro padrão por **período** (date range) + escopo da **org** atual.
2. Cada relatório = uma consulta agregada + visualização (tabela + gráfico simples).
3. **Origem padronizada** (spec 04) é o que viabiliza relatórios comparáveis (inclusive
   cross-org no painel do super_admin).
4. Custo/lucro depende da integração estoque↔serviço (spec 05/06).

## Pendências
- **Levantamento de requisitos** por relatório (métricas exatas, granularidade, export).
- Decidir o que é V1 (provável: serviços + financeiro) vs futuro.
- Necessidade de relatórios **cross-org** (super_admin) vs por org.

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §8](../reunioes/2026-revisao-funcionalidades-por-modulo.md#8-relatórios-novo-módulo).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ⏳ **Nova aba** de relatórios para o admin puxar dados **sem pedir export manual** ao
  desenvolvedor (substitui o "me manda os dados").
- ⏳ **Múltiplos relatórios** (Serviços, Funcionários, Clientes, Financeiros) com **filtros
  aplicáveis** (período, funcionário, etc.) e **exportar PDF/CSV**. Ex.: ranking de funcionário
  por faturamento (bonificação); serviços por origem no mês.
- ⏳ Exige **levantamento de requisitos próprio** antes do desenvolvimento.
