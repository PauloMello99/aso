import { IsBoolean, IsOptional } from "class-validator";

/**
 * `stripe.promotionCodes.update` (SDK `stripe@22.3.2`,
 * `PromotionCodeUpdateParams`) aceita `active`, `metadata` e
 * `restrictions.currency_options.*.minimum_amount` — este último fica fora
 * do escopo desta PR por decisão, não por limitação do Stripe. Percentual/
 * valor/duração são imutáveis no Coupon subjacente e `max_redemptions`/
 * `expires_at`/`code`/`customer` só são definíveis na criação do Promotion
 * Code. Por isso este DTO expõe deliberadamente só `active`.
 */
export class UpdateBillingCouponDto {
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
