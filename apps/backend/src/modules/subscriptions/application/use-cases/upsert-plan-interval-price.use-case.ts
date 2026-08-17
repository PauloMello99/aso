import { Inject, Injectable } from "@nestjs/common";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
} from "../../domain/billing-plan.repository.interface";
import {
  IBillingPlanPriceRepository,
  BILLING_PLAN_PRICE_REPOSITORY,
  BillingPlanPriceEntity,
} from "../../domain/billing-plan-price.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type { BillingInterval } from "../../domain/subscription.entity";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { AuditService } from "../../../audit/audit.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

export interface UpsertPlanIntervalPriceParams {
  amountCents: number;
  currency: string;
}

/**
 * Cria um preço Stripe para um intervalo de cobrança que o plano ainda não
 * oferece — ex.: plano hoje só tem `monthly`, este use-case habilita
 * `annual` pela primeira vez. Diferente de `RotatePlanIntervalPriceUseCase`
 * (que substitui um preço já existente para um intervalo já ativo), aqui não
 * há preço antigo para desativar/arquivar/transferir lookup_key — se o
 * intervalo já tem um preço ativo, o caminho correto é a rotação, não a
 * criação.
 */
@Injectable()
export class UpsertPlanIntervalPriceUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
    private readonly auditService: AuditService,
    private readonly revalidationClient: FrontendRevalidationClient,
  ) {}

  async execute(
    planKey: string,
    interval: BillingInterval,
    params: UpsertPlanIntervalPriceParams,
    actorAuthId: string,
  ): Promise<BillingPlanPriceEntity> {
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
      throw new InvalidBillingPlanUpdateException(
        "amountCents deve ser um inteiro positivo (centavos)",
      );
    }

    const plan = await this.billingPlanRepo.findByKey(planKey);
    if (!plan) throw new BillingPlanNotFoundException(planKey);

    if (!plan.stripeProductId || !plan.productKey) {
      throw new InvalidBillingPlanUpdateException(
        "plano sem produto Stripe associado — rode a sincronização do catálogo primeiro",
      );
    }

    const existingPrice =
      await this.billingPlanPriceRepo.findActiveByPlanIdAndInterval(
        plan.id,
        interval,
      );
    if (existingPrice) {
      throw new InvalidBillingPlanUpdateException(
        `intervalo '${interval}' já possui um preço ativo para o plano '${planKey}' — use a rotação de preço para alterá-lo`,
      );
    }

    const lookupKey = `${plan.productKey}-${interval}`;

    const { priceId } = await this.paymentGateway.createPrice({
      productId: plan.stripeProductId,
      amountCents: params.amountCents,
      currency: params.currency,
      interval,
      lookupKey,
    });

    const newPrice = await this.billingPlanPriceRepo.create({
      planId: plan.id,
      interval,
      amountCents: params.amountCents,
      currency: params.currency,
      stripePriceId: priceId,
      lookupKey,
      active: true,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan_price",
      entityId: newPrice.id,
      metadata: {
        operation: "create_interval_price",
        planKey,
        interval,
        stripePriceId: priceId,
      },
    });

    // Best-effort — a criação já foi concluída localmente e no Stripe; nunca
    // falha nem atrasa o retorno por causa de uma revalidação de cache do
    // frontend (a vitrine pública mostra este intervalo novo).
    await this.revalidationClient.revalidate("/");

    return newPrice;
  }
}
