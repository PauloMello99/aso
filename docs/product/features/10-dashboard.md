# 10 — Dashboard · 🆕 Novo

## Visão
Tela inicial da org com os principais indicadores operacionais e do negócio.

## Estado atual (ink-ops)
Página `overview.tsx` é placeholder. Há `OrgPagePlaceholder`.

## Legado a portar
Gráficos de **saldo** (via `balance_history_per_month`), contadores (count-up), tabelas. Sem
um dashboard consolidado por papel.

## Decisões das reuniões (11/06)
- Dashboard **prioritariamente para o administrador** do estúdio.
- Mostrar: indicadores do negócio, **estoque**, **movimentações recentes**, **alertas
  operacionais** (ex.: estoque baixo).
- **Futuro:** dashboards específicos por **funcionário** (métricas individuais).

## Comportamento alvo (V1 — direcional)
1. **Cards de resumo:** caixa (saldo dinheiro/banco), serviços do período, nº de clientes,
   estoque baixo.
2. **Movimentações recentes:** últimas transações/serviços.
3. **Alertas:** materiais abaixo do mínimo (spec 06), agenda do dia (spec 08).
4. Reaproveita as agregações de **Relatórios** (spec 09) e do **Caixa** (spec 07).

## Pendências
- Definir o conjunto exato de widgets da V1.
- Dashboard por funcionário (futuro) e por super_admin (visão da plataforma).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §9](../reunioes/2026-revisao-funcionalidades-por-modulo.md#9-dashboard).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ⏳ **Home do administrador**: últimos serviços/transações, caixa e serviços da semana, **estoque
  com pontos de atenção** (baixo/acabando), gráficos; **alerta visual no menu** (ex.: "!" em
  Estoque). É um "follow-up da empresa" — só para o dono na V1.
- 🔮 **Dashboard do funcionário** (próprios serviços/rendimentos) e do super_admin (plataforma).
