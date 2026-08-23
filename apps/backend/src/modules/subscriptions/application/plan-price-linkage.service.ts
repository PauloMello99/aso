import { Inject, Injectable } from "@nestjs/common";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../domain/ports/payment-gateway.port";
import { BillingPlanEntity } from "../domain/billing-plan.repository.interface";
import { BillingPlanPriceEntity } from "../domain/billing-plan-price.repository.interface";
import { TelemetryService } from "../../../common/telemetry/telemetry.service";

export interface ResolvedPlanPriceLinkage {
  stripeProductId: string;
  lookupKey: string;
}

/**
 * Resolve o par (stripeProductId, lookupKey) de um (plano, preço) sob ação
 * explícita do admin (rotação/reativação de preço), preenchendo o que faltar
 * a partir do Stripe ou derivando pela mesma regra usada na criação
 * (`${plan.productKey}-${price.interval}`, ver
 * `upsert-plan-interval-price.use-case.ts`).
 *
 * Existe porque uma linha ATIVA com `lookup_key` NULL é irrecuperável pelo
 * sync de boot: `SyncPlanCatalogUseCase.syncPlanEntryPrice` (linhas 241-255)
 * respeita qualquer linha (ativa ou não) já existente para o par
 * (plano, intervalo) e devolve "unchanged" sem nunca reparar a lacuna — só um
 * caminho sob ação explícita do admin (aqui) consegue sair desse estado.
 *
 * Não persiste nada: quem chama decide se/como grava o resultado. Também não
 * é um sync global — opera só sobre o par (plano, preço) recebido, ao
 * contrário de `ReconcilePlanCatalogUseCase`/`SyncPlanCatalogUseCase`, que
 * varrem o catálogo inteiro.
 */
@Injectable()
export class PlanPriceLinkageService {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly telemetry: TelemetryService,
  ) {}

  async resolve(
    plan: BillingPlanEntity,
    price: BillingPlanPriceEntity,
  ): Promise<ResolvedPlanPriceLinkage | null> {
    // Fast path: nada a resolver — não fala com o Stripe nem emite
    // telemetria. Requisito duro: specs existentes de rotação/ativação não
    // mockam `retrievePrice` e precisam continuar passando sem depender dele.
    if (plan.stripeProductId && price.lookupKey) {
      return {
        stripeProductId: plan.stripeProductId,
        lookupKey: price.lookupKey,
      };
    }

    let stripeProductId = plan.stripeProductId;
    let lookupKey = price.lookupKey;
    let source: "stripe" | "derived" | null = null;
    const backfilledFields: string[] = [];
    let stripePriceActive: boolean | undefined;

    if ((!stripeProductId || !lookupKey) && price.stripePriceId) {
      const stripePrice = await this.gateway.retrievePrice(price.stripePriceId);
      if (stripePrice) {
        if (!stripeProductId && stripePrice.productId) {
          stripeProductId = stripePrice.productId;
          backfilledFields.push("stripeProductId");
          source = "stripe";
        }
        if (!lookupKey && stripePrice.lookupKey) {
          lookupKey = stripePrice.lookupKey;
          backfilledFields.push("lookupKey");
          source = "stripe";
        }
        // Only meaningful once we know the fetch actually contributed a
        // field (`source === "stripe"`) — otherwise this Price lookup was a
        // dead end and the eventual `source` (if any) is "derived".
        if (source === "stripe") {
          stripePriceActive = stripePrice.active;
        }
      }
    }

    if (!lookupKey && plan.productKey) {
      lookupKey = `${plan.productKey}-${price.interval}`;
      source = source ?? "derived";
      backfilledFields.push("lookupKey");
    }

    if (!stripeProductId || !lookupKey) {
      return null;
    }

    if (source) {
      this.telemetry.captureMessage(
        `Billing plan price linkage backfilled for plan "${plan.key}"`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_PLAN_PRICE_LINKAGE_BACKFILLED",
          planKey: plan.key,
          interval: price.interval,
          priceRowId: price.id,
          source,
          backfilledFields,
          ...(stripePriceActive === false ? { stripePriceActive: false } : {}),
        },
      );
    }

    return { stripeProductId, lookupKey };
  }
}
