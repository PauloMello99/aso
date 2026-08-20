import { Inject, Injectable } from "@nestjs/common";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
} from "../../domain/billing-plan.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
  UpdateProductParams,
} from "../../domain/ports/payment-gateway.port";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { AuditService } from "../../../audit/audit.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

/**
 * Campos mutáveis do Stripe Product. Deliberadamente NÃO inclui `amountCents`
 * nem qualquer campo de preço: preço é imutável no Stripe e sua alteração é
 * modelada como rotação de price (nova price + `transferLookupKey`), fora do
 * escopo deste use-case.
 *
 * `highlighted`/`features` são campos LOCAIS (só existem em `billing_plans`)
 * — nunca são enviados ao Stripe.
 */
export interface UpdateBillingPlanProductParams {
  name?: string;
  description?: string | null;
  metadata?: Record<string, string>;
  active?: boolean;
  highlighted?: boolean;
  features?: string[];
}

const STRIPE_PRODUCT_FIELDS = [
  "name",
  "description",
  "metadata",
  "active",
] as const;

@Injectable()
export class UpdateBillingPlanProductUseCase {
  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly auditService: AuditService,
    private readonly revalidationClient: FrontendRevalidationClient,
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
      (key) =>
        params[key as keyof UpdateBillingPlanProductParams] !== undefined,
    );
    if (changedFields.length === 0) {
      throw new InvalidBillingPlanUpdateException(
        "Informe ao menos um campo para atualizar",
      );
    }

    if (params.name !== undefined && params.name.trim().length === 0) {
      throw new InvalidBillingPlanUpdateException("name não pode ser vazio");
    }

    const hasStripeFields = STRIPE_PRODUCT_FIELDS.some(
      (field) => params[field] !== undefined,
    );

    let updated: BillingPlanEntity;
    if (hasStripeFields) {
      // Só inclui as chaves de fato informadas (não `{ key: undefined }`
      // para as ausentes) — preserva o comportamento anterior de repassar
      // ao gateway apenas os campos que o chamador de fato enviou.
      const stripeParams: UpdateProductParams = {};
      if (params.name !== undefined) stripeParams.name = params.name;
      if (params.description !== undefined)
        stripeParams.description = params.description;
      if (params.metadata !== undefined)
        stripeParams.metadata = params.metadata;
      if (params.active !== undefined) stripeParams.active = params.active;

      const result = await this.paymentGateway.updateProduct(
        plan.stripeProductId,
        stripeParams,
      );

      updated = await this.billingPlanRepo.updateByKey(planKey, {
        name: result.name,
        description: result.description,
        metadata: result.metadata,
        active: result.active,
        ...(params.highlighted !== undefined && {
          highlighted: params.highlighted,
        }),
        ...(params.features !== undefined && { features: params.features }),
      });
    } else {
      updated = await this.billingPlanRepo.updateByKey(planKey, {
        ...(params.highlighted !== undefined && {
          highlighted: params.highlighted,
        }),
        ...(params.features !== undefined && { features: params.features }),
      });
    }

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan",
      entityId: updated.id,
      metadata: { operation: "update_product", changedFields },
    });

    // Best-effort — a atualização já foi persistida local/Stripe; nunca
    // falha nem atrasa o retorno por causa de uma revalidação de cache do
    // frontend.
    await this.revalidationClient.revalidate("/");

    return updated;
  }
}
