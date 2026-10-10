import { Inject, Injectable, Logger } from "@nestjs/common";
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
import { BillingCouponNotRedeemableException } from "../../domain/exceptions/billing-coupon-not-redeemable.exception";
import { BillingCouponCodeAlreadyExistsException } from "../../domain/exceptions/billing-coupon-code-already-exists.exception";
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
  private readonly logger = new Logger(UpdateBillingCouponUseCase.name);

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

    // Reativar só faz sentido se o Coupon E o Promotion Code ainda são
    // resgatáveis: o Stripe mantém `valid=false` no Coupon (esgotado/expirado)
    // mesmo com o código ativo, e o próprio código pode estar esgotado ou
    // expirado (limites do código, distintos dos do Coupon).
    if (params.active === true) {
      // O código só é único entre cupons ATIVOS (migration 0094): se outro
      // cupom ativo já o detém, reativar este violaria o índice parcial (e o
      // Stripe rejeitaria). Barra antes de tocar o Stripe.
      if (coupon.code) {
        const holder = await this.billingCouponRepo.findByCode(coupon.code);
        if (holder && holder.id !== coupon.id) {
          throw new BillingCouponCodeAlreadyExistsException();
        }
      }

      const remoteCoupon = await this.paymentGateway.retrieveCoupon(
        coupon.stripeCouponId,
      );
      if (!remoteCoupon || !remoteCoupon.valid) {
        throw new BillingCouponNotRedeemableException();
      }

      const remoteCode = await this.paymentGateway.retrievePromotionCode(
        coupon.stripePromotionCodeId,
      );
      if (
        !remoteCode ||
        (remoteCode.maxRedemptions !== null &&
          remoteCode.timesRedeemed >= remoteCode.maxRedemptions) ||
        (remoteCode.expiresAt !== null &&
          remoteCode.expiresAt.getTime() <= Date.now())
      ) {
        throw new BillingCouponNotRedeemableException();
      }
    }

    // O Promotion Code é atualizado primeiro: é ele que torna o cupom
    // (in)utilizável. O Coupon em si não tem "arquivado" no Stripe, então o
    // estado fica numa metadata; se ela falhar o código já mudou e o estado
    // local acompanha o Stripe (sem reverter).
    const result = await this.paymentGateway.updatePromotionCode(
      coupon.stripePromotionCodeId,
      { active: params.active },
    );

    if (params.active !== undefined) {
      await this.markCouponArchived(coupon.stripeCouponId, !params.active);
    }

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

  private async markCouponArchived(
    stripeCouponId: string,
    archived: boolean,
  ): Promise<void> {
    try {
      const updated = await this.paymentGateway.updateCouponMetadata(
        stripeCouponId,
        { aso_archived: archived ? "true" : "false" },
      );
      if (!updated) {
        this.logger.warn(
          `Stripe coupon ${stripeCouponId} no longer exists; archive marker not written`,
        );
      }
    } catch {
      // Intencionalmente sem a mensagem do provider: só ids.
      this.logger.warn(
        `Failed to write the archive marker on Stripe coupon ${stripeCouponId}; the promotion code state was already updated`,
      );
    }
  }
}
