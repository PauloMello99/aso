# ADR-0026 — Paginação offset-based nas listagens de recursos org-scoped

**Data**: 2026-09-03
**Status**: Aceito

## Contexto

A importação de dados do sistema legado Ink House para a org "Ink House Studio" trouxe
volume real (724 clientes, 1398 serviços, 3840 transações, 81 materiais, ~60 movimentos
de estoque numa única org) e expôs um gap pré-existente: **nenhuma listagem tinha
paginação**. Os use-cases de `customers`, `services`, `cashier` (transactions) e
`materials` faziam `SELECT ... ORDER BY ... DESC` sem `LIMIT`/`OFFSET`, devolvendo o
recurso inteiro da org a cada request; os hooks do frontend recebiam `T[]` cru e as
telas renderizavam a lista completa. Em `services`, a busca `?q=` era aplicada em
memória (`.filter()` pós-SELECT), o que a tornaria incompatível com paginação (o
`LIMIT` cortaria antes do filtro rodar).

## Decisão

### 1. Offset-based, não cursor

Mesmo padrão já usado em `list-audit-logs.use-case.ts`: `page`/`limit` → `offset =
(page-1)*limit`, `count()` separado, envelope `{ data, total, page, pages }`. Cursor
foi descartado por duas razões: (a) consistência com o único precedente do projeto; (b)
cursor exigiria chave composta estável em cada ORDER BY variável (`materials` já tem
`sortBy` alternável entre `name`/`lastUsedAt`), aumentando a complexidade sem ganho
claro nos volumes atuais.

**Ressalva aceita**: em `transactions` (livro-caixa append-only, `ORDER BY
transacted_at DESC`), um lançamento criado durante a navegação pode deslocar linhas
entre páginas (drift de offset). Mitigado por ORDER BY com desempate determinístico
(abaixo), nunca eliminado — aceitável para o caso de uso (consulta histórica, não feed
em tempo real).

### 2. `count()` exato por request

Sem `estimated_count`. Nos volumes atuais (milhares de linhas por org, não milhões) o
custo de um `count()` exato é desprezível; reavaliar apenas se algum tenant crescer
ordens de grandeza além disso.

### 3. Limites por lista

- `transactions`, `services`, `customers`, `materials` (tela cheia): default 50, max 200.
- `stock_movements` (painel lateral de histórico) e paineis de detalhe (histórico de
  serviços/transações de um cliente): default/uso menor (20 e 10, respectivamente).

### 4. Parâmetros de paginação nunca geram erro

`page`/`limit` inválidos, ausentes, não-numéricos ou fora do intervalo são clampados
(`page < 1` → 1; `limit` fora de `[1, max]` → default/max) — nunca `DomainException`.
Ver `resolvePageRequest`/`buildPaginated`/`parsePageParam` em
`apps/backend/src/common/pagination/pagination.ts`.

### 5. ORDER BY sempre com desempate determinístico

Todo `findPageByOrg`/`findPageByMaterial` acrescenta a chave primária (`id`) como
último critério do `ORDER BY`, além da coluna de negócio (ex.: `[desc(transactedAt),
desc(createdAt), desc(id)]`). Sem isso, colunas que empatam com frequência
(`transactedAt`, `performedAt`, `name`) fazem o `LIMIT/OFFSET` repetir ou pular linhas
entre páginas.

### 6. Busca (`q`/`search`) sempre em SQL, nunca em memória

`services` tinha `q` filtrado em memória pós-SELECT — migrado para `ILIKE` em SQL
(sobre `description` e nome do cliente via `leftJoin`), pré-requisito para paginar sem
perder resultados. `customers` já tinha `search` em SQL (confirmado, não precisou
migrar).

### 7. Coexistência deliberada: use-case "completo" + use-case "de tela"

`GetOverviewUseCase`/`GetOverviewAnalyticsUseCase` (KPIs) e todos os `Export*UseCase`
consomem os use-cases de listagem **originais** (`ListTransactionsUseCase`,
`ListServicesUseCase`, `ListCustomersUseCase`, `ListMaterialsUseCase`) para agregar ou
exportar o conjunto completo sob o filtro. Paginar esses use-cases quebraria KPIs
financeiros e exports silenciosamente. Por isso, cada domínio ganhou um use-case
**irmão**, sufixado `*PageUseCase`, usado exclusivamente pelo endpoint de listagem da
tela; o use-case original permanece intocado em assinatura e comportamento. Exceção:
`stock_movements`, cujo único consumidor é o próprio endpoint — migrado direto, sem
irmão.

Ambos os caminhos (completo e paginado) compartilham, no repositório, os mesmos
helpers privados `buildListConditions`/`listOrderBy`, para que um filtro novo nunca
precise ser replicado em dois lugares.

### 8. Endpoints `/options` para selects de apoio

Componentes que populam um `<Select>` a partir da listagem completa (Cliente em
`services-page`/`event-form`, Material no picker do `ServiceForm` e na conferência de
estoque) ficariam silenciosamente incompletos ao herdar o `limit` da tela paginada.
Criados `GET /orgs/:orgId/customers/options` e `GET /orgs/:orgId/materials/options`:
sem paginação, projeção enxuta (`{id, name}` para clientes; entidade quase completa —
sem mascarar `stockQuantity`/`minimumQuantity` — para materiais, preservando o mesmo
mascaramento de `costPerUnit` por permissão que a listagem paginada), cap rígido de
1000 itens, retornando `{ data, truncated }`. Quando `truncated: true`, a UI mostra um
aviso curto — a lista nunca fica incompleta em silêncio. `Material` do endpoint
`/options` alimenta o `ServiceForm` e o picker de materiais integralmente (todos os
campos usados por esses componentes — `id`, `name`, `stockQuantity` — estão presentes);
já `Customer` não pode ser totalmente substituído por `CustomerOption` onde o
consumidor precisa de campos fora de `{id, name}` (ex.: `ServiceForm` usa
`birthDate` para verificação de idade) — nesses casos o componente mantém as duas
fontes: `useCustomers` para o objeto completo, `useCustomerOptions` só para o select.

### 9. Frontend: `page` dentro do filtro (ou state próprio) + reset em qualquer mudança

Nas telas com um único acumulador de filtro (`cashier`, `services`), `page` entra no
mesmo objeto de filtro que já compõe a query-key — qualquer chamada de atualização de
filtro passa a resetar `page: 1`. Em telas cujo filtro é derivado de múltiplos estados
sem um único `setFilter` (`clients`, `stock`), `page` é um `useState` próprio, resetado
por um `useEffect` que observa os estados de filtro/busca. `keepPreviousData` do
TanStack Query evita "piscar" loading ao trocar de página. KPIs que antes liam
`lista.length`/`.filter(...).length` da listagem completa foram corrigidos para ler o
`total` do envelope paginado (e, quando o KPI depende de um subconjunto, uma segunda
chamada leve ao mesmo hook com `limit: 1` e o filtro do subconjunto, aproveitando o
`count()` do backend).

## Consequências

### O que passa a ser possível

- Listagens de `customers`, `services`, `cashier`/`transactions`, `materials` e
  `stock_movements` escalam para volume real de dados sem carregar tudo em memória
  (client e server) a cada request.
- Busca de `services` funciona através de todas as páginas (antes só enxergava a
  página "carregada" — hoje ainda mais crítico, pois o SELECT completo deixou de
  existir no caminho de tela).
- Padrão replicável: qualquer lista nova de recurso org-scoped tem uma receita pronta
  a seguir (seção nova em `domain-rules.md`).

### Débito conhecido (registrado, sem novo trabalho neste PR)

- Cap de 1000 nos endpoints `/options` ainda pode deixar um select incompleto em orgs
  muito grandes (a UI avisa via `truncated`, mas não resolve) — evoluir para combobox
  com busca server-side é o follow-up natural, não implementado aqui.
- Nenhum índice novo foi adicionado — os índices existentes cobrem os `ORDER BY`
  principais (`transactions_org_transacted_idx`,
  `stock_movements_material_id_created_at_idx`); `services(org_id, performed_at)` e
  `customers(org_id, name)` ficam como follow-up medido caso o `EXPLAIN` mostre custo
  relevante em produção.

## Alternativas rejeitadas

- **Cursor-based**: descartado (ver Decisão §1).
- **`estimated_count`/`count(*) OVER()`**: descartado nos volumes atuais (ver Decisão
  §2) — `count()` exato e `SELECT` de página em paralelo (`Promise.all`) já é rápido o
  suficiente.
- **`?all=true` no mesmo endpoint paginado** (em vez de `/options` dedicado): descartado
  — criaria um bypass de paginação no mesmo contrato (retorno em união, superfície de
  abuso) em vez de uma rota dedicada com cap e projeção próprios.

## Relacionado

- `list-audit-logs.use-case.ts` — padrão de referência original.
- `admin-ticket-queue-query.dto.ts` — padrão de DTO de query com `page`/`pageSize`
  (não usado aqui: os controllers desta mudança leem `page`/`limit` via `@Query()` +
  `parsePageParam`, sem DTO de classe, para não duplicar o parsing já feito pelos
  filtros existentes de cada endpoint).
- `admin-audit-logs.tsx` — padrão de referência do consumo no frontend (barra
  prev/next + "página X de Y"), generalizado em `PaginationBar`.
