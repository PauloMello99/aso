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
import { AuditService } from "../../../audit/audit.service";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";

export interface CreateBillingCouponParams {
  name: string;
  percentOff?: number;
  amountOffCents?: number;
  currency?: string;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  code?: string;
  maxRedemptions?: number;
  expiresAt?: Date;
}

@Injectable()
export class CreateBillingCouponUseCase {
  private readonly logger = new Logger(CreateBillingCouponUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_COUPON_REPOSITORY)
    private readonly billingCouponRepo: IBillingCouponRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    params: CreateBillingCouponParams,
    actorAuthId: string,
  ): Promise<BillingCouponEntity> {
    this.validate(params);

    const coupon = await this.paymentGateway.createCoupon({
      name: params.name,
      percentOff: params.percentOff,
      amountOffCents: params.amountOffCents,
      currency: params.currency,
      duration: params.duration,
      durationMonths: params.durationInMonths,
    });

    let promotionCode: { promotionCodeId: string; code: string };
    try {
      promotionCode = await this.paymentGateway.createPromotionCode({
        couponId: coupon.couponId,
        code: params.code,
        maxRedemptions: params.maxRedemptions,
        expiresAt: params.expiresAt,
      });
    } catch (error) {
      // Compensação: sem promotion code o Coupon fica órfão no Stripe (não
      // resgatável pelo fluxo de checkout). Best-effort — se o delete também
      // falhar, apenas logamos e propagamos o erro original abaixo.
      try {
        await this.paymentGateway.deleteCoupon(coupon.couponId);
      } catch (compensationError) {
        this.logger.warn(
          `Failed to compensate orphaned Stripe coupon ${coupon.couponId} after promotion code creation failure: ${
            compensationError instanceof Error
              ? compensationError.message
              : String(compensationError)
          }`,
        );
      }
      throw error;
    }

    const actor = await this.userRepo.findByAuthId(actorAuthId);

    // Upsert (não um insert puro) por `stripeCouponId`: o handler do webhook
    // para `coupon.created` pode correr em paralelo com esta chamada e
    // inserir a linha local primeiro (ver
    // HandleStripeWebhookUseCase.handleCouponUpserted). Um INSERT puro
    // falharia contra `UNIQUE(stripe_coupon_id)`, devolvendo 500 ao admin
    // para uma operação que já teve sucesso no Stripe — a reação natural
    // (repetir a requisição) criaria um Coupon/Promotion Code duplicado no
    // Stripe. Fazer upsert aqui converge para a mesma linha independente de
    // qual lado escreveu primeiro, preservando os campos que só o fluxo do
    // admin conhece (`createdBy`, o `code` escolhido).
    const created = await this.billingCouponRepo.upsertFromStripe({
      stripeCouponId: coupon.couponId,
      stripePromotionCodeId: promotionCode.promotionCodeId,
      code: promotionCode.code,
      name: params.name,
      percentOff: params.percentOff,
      amountOffCents: params.amountOffCents,
      currency: params.currency,
      duration: params.duration,
      durationInMonths: params.durationInMonths,
      maxRedemptions: params.maxRedemptions,
      expiresAt: params.expiresAt,
      createdBy: actor?.id ?? null,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_coupon",
      entityId: created.id,
      metadata: {
        operation: "create_coupon",
        stripeCouponId: coupon.couponId,
        code: promotionCode.code,
      },
    });

    return created;
  }

  private validate(params: CreateBillingCouponParams): void {
    const hasPercentOff = params.percentOff !== undefined;
    const hasAmountOff = params.amountOffCents !== undefined;

    if (hasPercentOff === hasAmountOff) {
      throw new InvalidCouponConfigException(
        "Informe exatamente um entre percentOff e amountOffCents",
      );
    }

    if (params.percentOff !== undefined) {
      if (
        !Number.isInteger(params.percentOff) ||
        params.percentOff < 1 ||
        params.percentOff > 100
      ) {
        throw new InvalidCouponConfigException(
          "percentOff deve ser um inteiro entre 1 e 100",
        );
      }
    }

    if (params.amountOffCents !== undefined) {
      if (!Number.isInteger(params.amountOffCents) || params.amountOffCents <= 0) {
        throw new InvalidCouponConfigException(
          "amountOffCents deve ser um inteiro positivo (centavos)",
        );
      }
      if (!params.currency) {
        throw new InvalidCouponConfigException(
          "currency é obrigatório quando amountOffCents é informado",
        );
      }
    }

    if (params.duration === "repeating") {
      if (
        params.durationInMonths === undefined ||
        !Number.isInteger(params.durationInMonths) ||
        params.durationInMonths <= 0
      ) {
        throw new InvalidCouponConfigException(
          "durationInMonths é obrigatório (inteiro positivo) quando duration é 'repeating'",
        );
      }
    } else if (params.durationInMonths !== undefined) {
      throw new InvalidCouponConfigException(
        "durationInMonths só é permitido quando duration é 'repeating'",
      );
    }

    if (params.expiresAt !== undefined && params.expiresAt <= new Date()) {
      throw new InvalidCouponConfigException(
        "expiresAt deve ser uma data futura",
      );
    }

    if (
      params.maxRedemptions !== undefined &&
      (!Number.isInteger(params.maxRedemptions) || params.maxRedemptions <= 0)
    ) {
      throw new InvalidCouponConfigException(
        "maxRedemptions deve ser um inteiro positivo",
      );
    }
  }
}
