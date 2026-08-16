import { Inject, Injectable } from "@nestjs/common";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
} from "../../domain/billing-plan.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { AuditService } from "../../../audit/audit.service";

/**
 * Campos mutáveis do Stripe Product. Deliberadamente NÃO inclui `amountCents`
 * nem qualquer campo de preço: preço é imutável no Stripe e sua alteração é
 * modelada como rotação de price (nova price + `transferLookupKey`), fora do
 * escopo deste use-case.
 */
export interface UpdateBillingPlanProductParams {
  name?: string;
  description?: string | null;
  metadata?: Record<string, string>;
  active?: boolean;
}

@Injectable()
export class UpdateBillingPlanProductUseCase {
  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    planKey: string,
    params: UpdateBillingPlanProductParams,
    actorAuthId: string,
  ): Promise<BillingPlanEntity> {
    const plan = await this.billingPlanRepo.findByKey(planKey);
    if (!plan) throw new BillingPlanNotFoundException(planKey);

    if (!plan.stripeProductId) {
      throw new InvalidBillingPlanUpdateException(
        "Plano sem produto Stripe associado",
      );
    }

    const changedFields = Object.keys(params).filter(
      (key) => params[key as keyof UpdateBillingPlanProductParams] !== undefined,
    );
    if (changedFields.length === 0) {
      throw new InvalidBillingPlanUpdateException(
        "Informe ao menos um campo para atualizar",
      );
    }

    if (params.name !== undefined && params.name.trim().length === 0) {
      throw new InvalidBillingPlanUpdateException(
        "name não pode ser vazio",
      );
    }

    const result = await this.paymentGateway.updateProduct(
      plan.stripeProductId,
      params,
    );

    const updated = await this.billingPlanRepo.updateByKey(planKey, {
      name: result.name,
      description: result.description,
      metadata: result.metadata,
      active: result.active,
    });

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan",
      entityId: updated.id,
      metadata: { operation: "update_product", changedFields },
    });

    return updated;
  }
}
