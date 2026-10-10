# ADR-0040 — Código de cupom: unicidade apenas entre ativos

**Status:** Aceito. Refina o espelho local de cupons do ADR-0023 (migration 0047).
**Data:** 2026-10-10

## Contexto

`billing_coupons` espelha Coupon + Promotion Code do Stripe. A migration 0047 criou `UNIQUE("code")` global, então um
código de cupom desativado/arquivado nunca podia ser reutilizado. Verificado no Stripe (modo teste): o Stripe só
proíbe dois Promotion Codes **ativos** com o mesmo código; reutilizar o código de um desativado é permitido. O
bloqueio vinha apenas do espelho local.

## Decisão

- Migration 0094 (manual, com `.down.sql` e entrada no journal): `DROP CONSTRAINT billing_coupons_code_unique` e
  `CREATE UNIQUE INDEX billing_coupons_code_active_unique ON billing_coupons (code) WHERE active AND code IS NOT NULL`.
  Dados existentes já eram únicos, então o índice não pode falhar; lock curto (tabela pequena).
- `IBillingCouponRepository.findByCode(code)` passa a devolver apenas a linha **ativa** com o código. Linha
  inativa/arquivada não bloqueia criação (pre-check do `CreateBillingCouponUseCase`) nem espelhamento via webhook
  (`mirrorNewPromotionCode`; um promotion code recebido inativo nem consulta colisão).
- Reativar (`UpdateBillingCouponUseCase`, `active: true`): se outro cupom ativo já usa o código, lança
  `BillingCouponCodeAlreadyExistsException` (409) antes de tocar o Stripe; o mapeamento do erro do Stripe permanece.
- Corrida entre dois ativos com o mesmo código: o 23505 de `billing_coupons_code_active_unique` é mapeado para
  `BillingCouponCodeAlreadyExistsException` em `create`/`update`/`upsertFromStripe` do repositório (não vira 500).

## Consequências

- Podem coexistir várias linhas com o mesmo `code` (uma ativa + históricas). Nada pode assumir `code` único globalmente;
  `findByCode` é o único ponto de resolução por código e retorna só a ativa.
- O `down` recria `UNIQUE(code)` e **falha** se houver duplicidade ativo/inativo: drenar/renomear antes de reverter.
- Mensagem de UI de `BILLING_COUPON_CODE_ALREADY_EXISTS`: "Já existe um cupom ativo com esse código."
