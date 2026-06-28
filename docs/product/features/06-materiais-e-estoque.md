# 06 — Materiais & Estoque (Stock) · ✅ Implementado

## Visão
Controle do estoque de materiais do estúdio (tintas, agulhas, luvas, descartáveis, etc.),
refletindo a realidade física e alimentando o custo dos serviços.

## Estado atual (ink-ops)
Módulo `modules/materials` + feature `features/stock` (completos, testados nesta sessão).
- `materials`: `id, org_id, category_id, name, unit, stock_quantity numeric(10,2),
  minimum_quantity, cost_per_unit, timestamps`.
- **`stock_movements`** (ledger): `type` ∈ `restock | service_consumption | manual_adjustment`,
  `quantity_delta`, `note`, `created_by`. Estoque é derivado/atualizado por movimento.
- Operações: CRUD, **repor** (restock), **ajustar** (delta +/-), **histórico** de movimentos,
  badge de **estoque baixo** (`stock_quantity <= minimum_quantity && minimum > 0`).
- Guardas: `AuthGuard` + `OrgMembershipGuard`.

> O ink-ops **já é superior ao legado**: legado usava um inteiro `amount` atualizado por
> `upsert`; aqui há um **ledger de movimentos** (auditável) e quantidades decimais.

## Legado a portar
`materials(name, category enum, amount int)` + `service_materials(material_id, service_id,
amount)`. Baixa de estoque acontecia na criação do serviço (upsert do `amount`). Restock manual
via mutation `update-stock`. **Não há** mínimo, unidade, custo nem histórico no legado.

## Decisões das reuniões (11/06)
- **Estoque realista** (registrado = físico).
- **Descartáveis (consumo unitário):** cartuchos, agulhas, luvas, barreiras → usou, saiu.
- **Parcialmente consumidos:** vaselina, sabão, limpeza → controlar frações é burocrático;
  após o **primeiro uso**, tratar como **consumido** para fins operacionais.
- **Integração estoque ↔ serviço:** materiais consumidos no serviço → custo real e lucro líquido.

## Comportamento alvo (V1)
1. **Consumo no serviço** gera `stock_movements` com `type=service_consumption` e
   `quantity_delta` negativo, ligado ao serviço (ver spec 05). `service_materials` mantém o
   vínculo material↔serviço com quantidade.
2. **Modelo de consumo** (descartável vs parcial): adicionar um atributo ao material indicando
   o comportamento — sugestão `consumption_mode ∈ {unit, single_use}`:
   - `unit`: baixa a quantidade informada.
   - `single_use` (parcial): a partir do 1º uso, baixa 1 unidade e o item é tratado como
     consumido (não fraciona). *(Regra a confirmar — pode ser só convenção operacional.)*
3. **Custo:** `cost_per_unit` já existe → permite calcular custo do serviço (Σ consumido × custo).
4. **Estoque baixo:** manter alerta; futuramente disparar notificação (spec 14, atrás de flag).
5. **Categorias:** `material_categories` por org (substitui o enum legado).

## Regras de negócio
- Toda alteração de estoque passa por um **movimento** (nunca editar `stock_quantity` direto).
- IDs de movimento append-only; estoque corrente = soma dos deltas (ou cache atualizado atômico).
- Consumo no serviço valida saldo suficiente antes (senão bloqueia o serviço — spec 05).

## Pendências
- Definir se `consumption_mode` vira coluna ou se "parcial = consumido" é só convenção de UX.
- Conectar a baixa de estoque ao caso de uso de criação de serviço (spec 05).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §6](../reunioes/2026-revisao-funcionalidades-por-modulo.md#6-materiais--estoque).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo. *(Nota: o campo `unit` citado no
> "Estado atual" foi **removido** — migration `0006`; o modelo de consumo virou a flag abaixo.)*

**Campos / comportamento**
- ✅ **Flag `shareable` (compartilhável)** — material não é debitado por inteiro a cada serviço
  (ex.: vaselina, tinta, luva). Substitui a ideia de `consumption_mode`. No lançamento o
  funcionário responde **"acabou?"** → se sim, debita (🟡 — virá com Serviços). Descartáveis
  (cartucho/agulha) debitam por uso ✅.
- ⏳ **Ordenar por "último utilizado"** + listar **mais usados** primeiro (campo de data
  last-used), inclusive na listagem do lançamento de serviço. **Buscar por nome**.
- ⏳ **Arquivar** material (lista arquivados × ativos, reativável) — material já usado **não pode
  ser excluído** (mataria a referência do serviço). 🟡 hoje a exclusão é **bloqueada** se
  vinculado (`MATERIAL_IN_USE_BY_SERVICES`); "excluir só se nunca usado" é 🔮 V2.

**Verificação periódica**
- ⏳ **Lembrete configurável por org** (a cada N dias) + **histórico de verificações** + **cron**
  diário avaliando a diferença desde a última; notificação desabilitável.
- ⏳ Detectar **discrepância** verificação × lançamento (ex.: sistema 20, gaveta 5).
- 🟡 **Alerta de estoque baixo** in-app/dashboard (existe); push externo (e-mail/celular) 🔮.

**Rejeitado** ❌
- Lançar por **caixa/unidade composta** (1 caixa = 20 cartuchos) — estoque é unitário/consumível.
- **Fracionar** consumo (50 g de vaselina, folhas de papel toalha) — burocracia; resolvido pela
  flag compartilhável + "acabou?".
