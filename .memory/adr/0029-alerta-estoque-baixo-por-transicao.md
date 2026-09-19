# ADR-0029 — Alerta de estoque baixo (in-app + e-mail) disparado por transição

**Status:** Aceito
**Data:** 2026-09-19

## Contexto

Bloco 5.1 do backlog da reunião de **2026-09-15**. Antes, "estoque baixo" existia só como leitura
(`MaterialEntity.isLowStock`, card/banner no overview): sem aviso ativo. Direção do produto: avisar
**in-app e por e-mail, imediatamente**, disparado pelas **escritas que mudam o estoque** — não por
cron/varredura periódica (custo de banco). Não confundir com `SendStockCheckRemindersUseCase`
(lembrete periódico de *conferência* de estoque, cron).

## Decisões

### 1. Detecção por transição com marcador persistido

`materials.low_stock_alerted_at timestamptz NULL` (migration 0077; sem backfill). NULL = nenhum
alerta aberto. O **mesmo UPDATE** que altera `stock_quantity` recalcula o marcador:
`CASE WHEN archived_at IS NULL AND minimum_quantity > 0 AND novo_estoque <= minimum_quantity
THEN COALESCE(low_stock_alerted_at, now()) ELSE NULL END`. `crossedLowStock = prev IS NULL AND next
IS NOT NULL`. Efeito: 1 alerta por "episódio"; nova baixa ainda abaixo do mínimo não re-dispara;
voltar acima do mínimo zera e reabre o ciclo. Antes do UPDATE, `SELECT … FOR UPDATE` serializa
escritas concorrentes (exatamente-uma-vez). Único choke-point: `updateStockQuantity`
(`drizzle-material.repository.ts`) — retorna `{ material, crossedLowStock }`. `syncLowStockMarker(id)`
cobre o caso "dono altera o mínimo" (só quando `minimumQuantity` muda; renomear nunca alerta).
`setArchived` zera o marcador; material arquivado nunca alerta; criar material nunca alerta (nasce com 0).

Caminhos ligados: adjust-stock, restock-material, create-stock-verification (reconcile), create-service
(débitos), cancel-service, update-material (mínimo). Cancelamento entra porque o CASE roda em toda
escrita: sem ligá-lo, devolver estoque a material já abaixo do mínimo (marcador NULL pós-deploy)
abriria o episódio em silêncio e suprimiria o alerta real seguinte.

**Restrição:** `lockAlertMarker` exige a transação de request (`RlsContext.runWithClaims`); fora dela
(cron/bootstrap) o `FOR UPDATE` não segura e a garantia degrada para read-then-write. Não chamar de cron.

### 2. Envio pós-COMMIT, destacado, agrupado por operação

`LowStockAlertService.scheduleIfAny(orgId, crossed[])` registra `registerPostCommit` (lista vazia ⇒ não
toca em nada). **Deliberadamente diferente do `AuditService`:** o hook é síncrono e o `dispatch` roda
destacado (`void … .catch(log)`), **não awaited** — `runWithClaims` aguarda os hooks e há HTTP ao Resend;
a latência/falha de e-mail nunca pode atrasar nem falhar a escrita de estoque. **Não "corrigir" para await.**
Rollback ⇒ hook nunca roda ⇒ nenhuma notificação. O dispatch só usa pool ADMIN/HTTP (`findOwnerUserIds`
+ `NotificationService`, ambos `DRIZZLE_ADMIN` — notificar OUTRO usuário fora do contexto RLS, mesma
exceção deliberada do ADR-0021); **nunca injetar `DRIZZLE`** (client da request já liberado; falharia por
RLS em silêncio). Dos repos com dois pools, só `findOwnerUserIds` pode ser chamado do hook.
Uma operação com N cruzamentos ⇒ **1 notificação por dono** (título `Estoque baixo: <nome>` ou
`N materiais abaixo do mínimo`). In-app é gravado antes do e-mail.
Consequência: a notificação in-app é gravada *depois* da resposta HTTP — teste que leia o sino
imediatamente pode ser flaky; falhas só aparecem em log.

### 3. Destinatários e escopo

Donos da org (reuso de `findOwnerUserIds`); sem opt-out por org por ora (extensão futura possível:
`organizations.low_stock_alert_enabled`); e-mail genérico via `NotificationEmail`. Fora de produção o
e-mail só sai para a allowlist (ADR-0028); in-app funciona sempre. Novo valor `low_stock` em
`notification_type` (migration 0078). Sem novo endpoint, cron ou `DomainException`.

### 4. Nuances de migração (guardian)

- 0078 é `ALTER TYPE … ADD VALUE` em migration própria, mas o migrator aplica **todas as pendentes numa
  única transação**: nenhuma migration futura pode *usar* `'low_stock'` enquanto a 0078 estiver
  pendente no mesmo lote (falha "unsafe use of new value" só em produção). Down é no-op (padrão 0013).
- Rollback da 0077 apaga os marcadores ⇒ todo material abaixo do mínimo re-alerta na escrita seguinte.
- Sem backfill: material já abaixo do mínimo no deploy alerta na primeira escrita que o deixar `<=` mínimo
  com marcador NULL (comportamento aceito; é 1 alerta por material, não rajada).

## Consequências / dívidas

- Se o COMMIT passa e o envio falha, o marcador já está setado: aquele episódio perde o e-mail
  (in-app é gravado primeiro; best-effort como o `NotificationService`).
- `registerPostCommit` é importado de `database.module` na camada de aplicação (precedente:
  `audit.service.ts`); custo: specs precisam de `jest.mock` do módulo. Reexportar de módulo neutro se incomodar.
- Sem teste de integração do SQL do CASE/`FOR UPDATE` (backend sem harness de banco). Verificado
  manualmente em 2026-09-19 (banco local): cruzar ⇒ 1 notificação; nova baixa ⇒ nenhuma; repor e baixar ⇒
  novo episódio; serviço com 2 materiais ⇒ 1 notificação `2 materiais…`; arquivado/mínimo 0 ⇒ nada;
  falha de e-mail ⇒ escrita 2xx. Regressão silenciosa possível se `COALESCE` for trocado por `now()` — revisar
  `lowStockMarkerExpr` a cada mudança.
- `packages/types/src/database.types.ts` está morto/defasado (pré-existente, fora do escopo).
