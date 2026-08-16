import { Inject, Injectable } from "@nestjs/common";
import {
  IBillingCouponRepository,
  BILLING_COUPON_REPOSITORY,
  BillingCouponEntity,
} from "../../domain/billing-coupon.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import { InvalidCouponConfigException } from "../../domain/exceptions/invalid-coupon-config.exception";
import { BillingCouponNotFoundException } from "../../domain/exceptions/billing-coupon-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

/**
 * Campos mutáveis de um Promotion Code no Stripe. `stripe.promotionCodes.update`
 * (`PromotionCodeUpdateParams`, SDK `stripe@22.3.2`) aceita `active`,
 * `metadata` e `restrictions.currency_options.*.minimum_amount` — este último
 * é deliberadamente fora do escopo desta PR, não uma limitação do Stripe.
 * `code`, `max_redemptions`, `expires_at`, `customer` e as demais
 * `restrictions` só são definíveis na criação do Promotion Code, e
 * `percent_off`/`amount_off`/`duration` são imutáveis no Coupon subjacente.
 * Por isso este use-case aceita apenas `active`.
 */
export interface UpdateBillingCouponParams {
  active?: boolean;
}

const MUTABLE_FIELDS: ReadonlyArray<keyof UpdateBillingCouponParams> = [
  "active",
];

@Injectable()
export class UpdateBillingCouponUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_COUPON_REPOSITORY)
    private readonly billingCouponRepo: IBillingCouponRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    couponId: string,
    params: UpdateBillingCouponParams,
    actorAuthId: string,
  ): Promise<BillingCouponEntity> {
    const coupon = await this.billingCouponRepo.findById(couponId);
    if (!coupon) throw new BillingCouponNotFoundException(couponId);

    const receivedFields = Object.keys(params) as Array<
      keyof UpdateBillingCouponParams
    >;
    const unsupportedFields = receivedFields.filter(
      (field) => !MUTABLE_FIELDS.includes(field),
    );
    if (unsupportedFields.length > 0) {
      throw new InvalidCouponConfigException(
        "Cupom é imutável no Stripe: percentual/valor/duração não podem ser alterados, crie um novo cupom",
      );
    }

    const changedFields = receivedFields.filter(
      (field) => params[field] !== undefined,
    );
    if (changedFields.length === 0) {
      throw new InvalidCouponConfigException(
        "Informe ao menos um campo para atualizar",
      );
    }

    if (!coupon.stripePromotionCodeId) {
      throw new InvalidCouponConfigException(
        "Cupom sem promotion code associado",
      );
    }

    const result = await this.paymentGateway.updatePromotionCode(
      coupon.stripePromotionCodeId,
      { active: params.active },
    );

    const updated = await this.billingCouponRepo.update(couponId, {
      active: result.active,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_coupon",
      entityId: updated.id,
      metadata: { operation: "update_coupon", changedFields },
    });

    return updated;
  }
}
