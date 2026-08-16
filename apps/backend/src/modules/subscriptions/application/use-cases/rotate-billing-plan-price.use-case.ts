import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
} from "../../domain/billing-plan.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type { BillingInterval } from "../../domain/subscription.entity";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { AuditService } from "../../../audit/audit.service";

/**
 * Stripe Price é imutável: "editar preço" é modelado como rotação — cria um
 * novo Price, transfere o `lookup_key` do antigo para o novo
 * (`transferLookupKey`) e arquiva o antigo. Assinantes com subscription já
 * ativa continuam vinculados ao Price antigo (Stripe não migra assinaturas
 * existentes automaticamente); o valor novo só vale para novos checkouts a
 * partir daqui. Migrar assinantes existentes para o novo preço é decisão de
 * negócio fora do escopo deste use-case.
 */
export interface RotateBillingPlanPriceParams {
  amountCents: number;
  currency?: string;
  interval?: BillingInterval;
}

@Injectable()
export class RotateBillingPlanPriceUseCase {
  private readonly logger = new Logger(RotateBillingPlanPriceUseCase.name);

  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    planKey: string,
    params: RotateBillingPlanPriceParams,
    actorAuthId: string,
  ): Promise<BillingPlanEntity> {
    if (
      !Number.isInteger(params.amountCents) ||
      params.amountCents <= 0
    ) {
      throw new InvalidBillingPlanUpdateException(
        "amountCents deve ser um inteiro positivo (centavos)",
      );
    }

    const plan = await this.billingPlanRepo.findByKey(planKey);
    if (!plan) throw new BillingPlanNotFoundException(planKey);

    if (!plan.stripeProductId || !plan.lookupKey) {
      throw new InvalidBillingPlanUpdateException(
        "plano sem produto/lookup_key associado — rode a sincronização do catálogo primeiro",
      );
    }

    const currency = params.currency ?? plan.currency;
    const interval = params.interval ?? (plan.interval as BillingInterval);

    const isNoOp =
      params.amountCents === plan.amountCents &&
      currency === plan.currency &&
      interval === plan.interval;
    if (isNoOp) {
      return plan;
    }

    const oldPriceId = plan.stripePriceId;

    const { priceId: newPriceId } = await this.paymentGateway.createPrice({
      productId: plan.stripeProductId,
      amountCents: params.amountCents,
      currency,
      interval,
      lookupKey: plan.lookupKey,
      transferLookupKey: true,
    });

    // Persiste o estado local ANTES de arquivar o preço antigo, deliberadamente:
    // se o processo morrer entre as duas etapas, o estado local já aponta pro
    // preço correto (o novo). A ordem inversa deixaria o local apontando pra um
    // preço já arquivado no Stripe caso o processo morresse antes do archive.
    const updated = await this.billingPlanRepo.updateByKey(planKey, {
      stripePriceId: newPriceId,
      amountCents: params.amountCents,
      currency,
      interval,
      lastSyncedAt: new Date(),
    });

    if (oldPriceId) {
      try {
        await this.paymentGateway.archivePrice(oldPriceId);
      } catch (error) {
        // Best-effort: o lookup_key já migrou e o novo preço já é o vigente,
        // então não desfazemos a rotação nem propagamos o erro do archive.
        this.logger.warn(
          `Failed to archive old Stripe price ${oldPriceId} for plan ${planKey}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan",
      entityId: updated.id,
      metadata: {
        operation: "rotate_price",
        oldPriceId,
        newPriceId,
        oldAmountCents: plan.amountCents,
        newAmountCents: params.amountCents,
      },
    });

    return updated;
  }
}
