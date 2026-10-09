# ADR-0037 — Caixa de entrada de orçamentos (Bloco C, fatia C2)

**Status:** Aceito (C2). Complementa o ADR-0036 e o ADR-0021.
**Data:** 2026-10-09

## Contexto

C1 (ADR-0036) deixou `quote_requests`/`quote_request_images` sem policy de leitura. A C2 entrega a
caixa de entrada: lista, detalhe com imagens, "lido", badge na sidebar, notificação e permissão de módulo.
Tudo continua atrás de `PUBLIC_QUOTE_FORM_ENABLED` (default off).

## Decisão

- **Escopo**: funcionário vê só pedidos com `target_user_id` = o próprio; owner e super_admin (ADR-0013)
  veem toda a org. Policies da migration `0089`: `is_super_admin() OR is_org_owner(org_id) OR
  is_self_member(org_id, target_user_id)`; imagens herdam por `EXISTS` em `quote_requests` (RLS do invocador).
  Pedido com `expires_at <= now()` não aparece (lista, contagem, detalhe, marcar lido → 404); o filtro é da
  aplicação (o RLS não filtra expiração).
- **"Lido" = `viewed_at` único por pedido**: abrir o detalhe marca lido (`POST :id/viewed`, idempotente,
  `WHERE viewed_at IS NULL`); owner/super_admin que abre zera o "não lido" do funcionário (ele ainda tem a
  notificação). Alternativa futura: tabela de leitura por usuário.
- **Privilégio de coluna** (alternativa sancionada ao trigger/allowlist rejeitados no ADR-0021): `REVOKE UPDATE
  ON quote_requests FROM app_user` + `GRANT UPDATE (viewed_at) TO app_user` + policy de UPDATE no mesmo escopo.
  Sem GRANT a `anon`/`authenticated` (o `REVOKE` da 0087 permanece). **Gotcha para a C3**: novas colunas
  atualizáveis pela sessão (ex.: `status`) precisam ser incluídas no GRANT de coluna, senão 42501.
- **Permissão `quotes`** (`MODULE_KEYS`; funcionário liberado por padrão): backfill na `0089` para funcionários
  existentes, `DEFAULT_EMPLOYEE_PERMISSIONS` inclui `quotes`, owner liga/desliga por pessoa. O lookup público
  (`findPublicBySlugAsAdmin`) passou a exigir `role='owner' OR 'quotes' = ANY(permissions)`: sem o módulo o
  formulário público do funcionário responde a mesma 404 uniforme (nunca entra pedido para quem não pode abrir a
  caixa). O `down` da 0089 **não** reverte o backfill; o código pré-C2 filtra chaves desconhecidas, então um
  rollback + edição de permissões remove `quotes` em silêncio (reconceder depois).
- **Imagens**: signed URL de **300 s**, resposta do detalhe com `Cache-Control: no-store` (também lista e
  contagem), autorização **antes** de assinar, `storagePath`/snapshot de consentimento nunca na resposta; falha
  do storage degrada (`imagesUnavailable`), HEIC/HEIF com `previewable=false` e fallback "Baixar".
- **Notificação** `quote_request_received` (migration própria `0090`, valor de enum não usado no mesmo lote):
  só o profissional destino, in-app, `email:false`, sem PII, **fora** do `try` que faz `cleanupUploads` (uma
  falha não apaga imagens de um pedido já commitado). Owner não é notificado por pedidos alheios.
- **Frontend**: item "Orçamentos" + badge numérico (polling 60 s, `refetchIntervalInBackground:false`, só quando
  `available && canAccessModule`). **Sinal de disponibilidade sem expor a flag**: `GET /orgs/:id/quote-forms/me`
  (404 = flag off) via `useQuotesAvailability`; o tour exclui módulos indisponíveis (set `unavailable`;
  `null` enquanto carrega). Toggle de permissão oculto com flag off, mas `permsDraft` preserva `quotes`.
  `wa.me/<dígitos>` sem texto pré-preenchido (sem PII na URL); telefone sem `+` ganha prefixo `55`
  (`5511…` digitado sem `+` vira `555511…`: regra aceita, revisar se houver relato).

## Consequências / pendências

- **Release adiado**: sem bump nem item de changelog na C2 (um minor dispararia banner/e-mail aos donos de um
  módulo invisível). No go-live: `pnpm version:bump minor` (1.3.0), item de changelog (`module: 'quotes'`) e
  **atualizar `ONBOARDING_MODULE_META.quotes.introducedAt` para o instante do go-live** (senão quem conclui o
  tour com a flag off passa a ter `quotes` como "visto" pelo fallback de data).
- Go-live da flag continua condicionado à C3 (retenção/expiração e limpeza de storage).
- `types_db.ts` não reflete `quote_*` nem `viewed_at` (gerado à mão só no enum); regenerar com `pnpm db:gen-types`.
- Hash de migration no Windows (`core.autocrlf`): `db:status` local mostra "file changed since applied"; deploy
  Linux não é afetado (sugestão: `*.sql text eol=lf` em `.gitattributes`, mudança separada).
