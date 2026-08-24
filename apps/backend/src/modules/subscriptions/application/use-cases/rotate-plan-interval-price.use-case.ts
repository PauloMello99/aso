import { Inject, Injectable, Logger } from "@nestjs/common";
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
import { PlanIntervalNotEnabledException } from "../../domain/exceptions/plan-interval-not-enabled.exception";
import { AuditService } from "../../../audit/audit.service";
import {
  MigrateSubscribersToPriceUseCase,
  MigrateSubscribersReport,
} from "./migrate-subscribers-to-price.use-case";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";
import { PlanPriceLinkageService } from "../plan-price-linkage.service";

export interface RotatePlanIntervalPriceParams {
  amountCents: number;
  currency?: string;
}

/**
 * Stripe Price é imutável: "editar preço" é modelado como rotação — cria um
 * novo Price, transfere o `lookup_key` do antigo para o novo
 * (`transferLookupKey`) e arquiva o antigo. A unidade de rotação é o par
 * (plano, intervalo): cada plano pode ter N preços ativos, um por intervalo
 * de cobrança (`billing_plan_prices`).
 *
 * Assinantes com subscription já ativa continuam vinculados ao Price antigo
 * até o final deste fluxo (Stripe não migra assinaturas existentes
 * automaticamente): depois de rotacionar o Price, este use-case chama
 * `MigrateSubscribersToPriceUseCase` para mover os assinantes elegíveis do
 * Price antigo para o novo, com relatório por assinatura anexado ao
 * retorno.
 */
@Injectable()
export class RotatePlanIntervalPriceUseCase {
  private readonly logger = new Logger(RotatePlanIntervalPriceUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
    private readonly auditService: AuditService,
    private readonly migrateSubscribers: MigrateSubscribersToPriceUseCase,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly telemetry: TelemetryService,
    private readonly revalidationClient: FrontendRevalidationClient,
    private readonly planPriceLinkage: PlanPriceLinkageService,
  ) {}

  async execute(
    planKey: string,
    interval: BillingInterval,
    params: RotatePlanIntervalPriceParams,
    actorAuthId: string,
  ): Promise<{
    price: BillingPlanPriceEntity;
    migration: MigrateSubscribersReport;
  }> {
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
      throw new InvalidBillingPlanUpdateException(
        "amountCents deve ser um inteiro positivo (centavos)",
      );
    }

    const plan = await this.billingPlanRepo.findByKey(planKey);
    if (!plan) throw new BillingPlanNotFoundException(planKey);

    const currentPrice =
      await this.billingPlanPriceRepo.findActiveByPlanIdAndInterval(
        plan.id,
        interval,
      );
    if (!currentPrice) {
      throw new PlanIntervalNotEnabledException(planKey, interval);
    }

    const currency = params.currency ?? currentPrice.currency;

    const isNoOp =
      params.amountCents === currentPrice.amountCents &&
      currency === currentPrice.currency;
    if (isNoOp) {
      return { price: currentPrice, migration: { results: [] } };
    }

    // Stripe rejeita mudança de moeda numa subscription existente
    // (`stripe.subscriptions.update`): se a rotação trocar a moeda e houver
    // assinantes migráveis para o Price atual, a migração pós-rotação
    // (MigrateSubscribersToPriceUseCase) falharia para 100% deles, deixando
    // todo mundo preso no Price antigo já arquivado. Rejeitamos ANTES de
    // falar com o Stripe, não depois.
    const isCurrencyChange =
      params.currency !== undefined && currency !== currentPrice.currency;
    if (isCurrencyChange && currentPrice.stripePriceId) {
      const migratableSubscriptions =
        await this.subscriptionRepo.findMigratableByStripePriceId(
          currentPrice.stripePriceId,
        );
      if (migratableSubscriptions.length > 0) {
        throw new InvalidBillingPlanUpdateException(
          "não é possível trocar a moeda de um preço com assinantes ativos — cancele as assinaturas atuais primeiro ou mantenha a mesma moeda",
        );
      }
    }

    // Só exigido a partir daqui: o no-op acima não precisa de
    // produto/lookup_key válidos, só a rotação de fato (que fala com o
    // Stripe) precisa. `PlanPriceLinkageService` se auto-recupera a partir
    // do Stripe (ou deriva de `productKey`) quando a linha local está com
    // `stripeProductId`/`lookupKey` faltando — não depende mais de rodar o
    // sync de boot.
    const linkage = await this.planPriceLinkage.resolve(plan, currentPrice);
    if (!linkage) {
      throw new InvalidBillingPlanUpdateException(
        "Não foi possível resolver o produto/lookup_key deste plano no Stripe — verifique se o preço ainda existe no Stripe e se o plano tem productKey configurado.",
      );
    }

    const { priceId: newPriceId } = await this.paymentGateway.createPrice({
      productId: linkage.stripeProductId,
      amountCents: params.amountCents,
      currency,
      interval,
      lookupKey: linkage.lookupKey,
      transferLookupKey: true,
    });

    // Desativa a linha antiga (limpa active+lookupKey) ANTES de criar a
    // nova, deliberadamente: os índices únicos parciais em
    // billing_plan_prices são por linha ATIVA — (plan_id, interval) e
    // lookup_key só podem ter uma linha ativa por vez. Criar a nova antes de
    // desativar a antiga colidiria com esses índices.
    //
    // Não há transação envolvendo os dois passos abaixo. O módulo `support`
    // tem um `ITransactionRunner` (drizzle-transaction-runner.ts), mas ele é
    // um port específico daquele módulo e `IBillingPlanPriceRepository` não
    // expõe overloads *AsAdmin(tx)/transacionais para `deactivateById`/
    // `create` — importar o port de outro módulo ou reescrever o repositório
    // (interface + impl Drizzle) só para este caso seria desproporcional
    // pra este PR. Em vez disso, compensamos manualmente: se `create` falhar
    // depois de `deactivateById` ter tido sucesso, reativamos a linha antiga
    // (`linkage.lookupKey` — resolvido/recuperado acima, pode não coincidir
    // com o `currentPrice.lookupKey` original quando este estava faltando —
    // continua íntegro em memória; `deactivateById` só limpa a coluna no
    // banco, não muta objetos já carregados — mas capturamos numa constante
    // nomeada para deixar a intenção explícita).
    // A compensação NÃO é perfeita: o Stripe já transferiu o `lookup_key`
    // (`transferLookupKey: true`) para o Price novo antes desse ponto, então
    // a linha antiga reativada fica com um `lookupKey` local que o Stripe já
    // não associa mais a ela. Aceitamos essa divergência residual — a
    // alternativa (nenhuma linha ativa) é pior, pois derruba o checkout
    // daquele intervalo sem caminho de recuperação pela UI.
    const oldLookupKey = linkage.lookupKey;
    await this.billingPlanPriceRepo.deactivateById(currentPrice.id);

    let newPrice: BillingPlanPriceEntity;
    try {
      newPrice = await this.billingPlanPriceRepo.create({
        planId: plan.id,
        interval,
        amountCents: params.amountCents,
        currency,
        stripePriceId: newPriceId,
        lookupKey: oldLookupKey,
        active: true,
      });
    } catch (createError) {
      try {
        await this.billingPlanPriceRepo.updateById(currentPrice.id, {
          active: true,
          lookupKey: oldLookupKey,
        });
      } catch (compensationError) {
        this.logger.error(
          `CRITICAL: failed to compensate rotation for plan "${planKey}"/${interval} — old price row ${currentPrice.id} could not be reactivated after "create" failed. Pair (plan, interval) is left with NO active row.`,
          compensationError instanceof Error
            ? compensationError.stack
            : String(compensationError),
        );
        this.telemetry.captureException(compensationError, {
          module: "subscriptions",
          code: "BILLING_PRICE_ROTATION_COMPENSATION_FAILED",
          planKey,
          interval,
          oldPriceRowId: currentPrice.id,
        });
        throw createError;
      }

      throw createError;
    }

    const oldPriceId = currentPrice.stripePriceId;
    if (oldPriceId) {
      try {
        await this.paymentGateway.archivePrice(oldPriceId);
      } catch (error) {
        // Best-effort: o lookup_key já migrou e o novo preço já é o
        // vigente, então não desfazemos a rotação nem propagamos o erro do
        // archive.
        this.logger.warn(
          `Failed to archive old Stripe price ${oldPriceId} for plan ${planKey}/${interval}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan_price",
      entityId: newPrice.id,
      metadata: {
        operation: "rotate_price",
        planKey,
        interval,
        oldPriceId,
        newPriceId,
        oldAmountCents: currentPrice.amountCents,
        newAmountCents: params.amountCents,
      },
    });

    // oldPriceId is only absent when the price row was never actually
    // created in Stripe (rare/legacy data) — nothing to migrate subscribers
    // away from in that case.
    const migration = oldPriceId
      ? await this.migrateSubscribers.execute({ oldPriceId, newPriceId })
      : { results: [] };

    // Best-effort — a rotação já foi concluída localmente e no Stripe;
    // nunca falha nem atrasa o retorno por causa de uma revalidação de
    // cache do frontend.
    await this.revalidationClient.revalidate("/");

    return { price: newPrice, migration };
  }
}
