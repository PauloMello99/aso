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
import type { BillingInterval } from "../../domain/subscription.entity";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { PlanIntervalNotEnabledException } from "../../domain/exceptions/plan-interval-not-enabled.exception";
import { AuditService } from "../../../audit/audit.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

/**
 * Habilita/desabilita um intervalo de cobrança já existente para um plano,
 * sem tocar no Stripe (o Price já existe lá, ativo ou não; aqui só
 * alternamos a flag `active` na linha local). Bloqueia desabilitar o
 * último intervalo ativo do plano — isso derrubaria o checkout inteiro.
 */
@Injectable()
export class SetPlanIntervalActiveUseCase {
  constructor(
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
    active: boolean,
    actorAuthId: string,
  ): Promise<BillingPlanPriceEntity> {
    const plan = await this.billingPlanRepo.findByKey(planKey);
    if (!plan) throw new BillingPlanNotFoundException(planKey);

    // `findActiveByPlanIdAndInterval` primeiro: se a linha ativa existe, é
    // ela — sem ambiguidade. Só cai no fallback (qualquer status, mais
    // recente primeiro) quando não há linha ativa, para reativar um
    // intervalo previamente desabilitado; um plano rotacionado várias vezes
    // acumula várias linhas inativas para o mesmo (plano, intervalo) e só a
    // mais recente tem `lookupKey` preservado (`deactivateById` limpa o das
    // demais).
    const price =
      (await this.billingPlanPriceRepo.findActiveByPlanIdAndInterval(
        plan.id,
        interval,
      )) ??
      (await this.billingPlanPriceRepo.findByPlanIdAndInterval(
        plan.id,
        interval,
      ));
    if (!price) {
      throw new PlanIntervalNotEnabledException(planKey, interval);
    }

    if (!active) {
      const activePrices = await this.billingPlanPriceRepo.findActiveByPlanId(
        plan.id,
      );
      const isLastActive =
        activePrices.length === 1 && activePrices[0]!.id === price.id;
      if (isLastActive) {
        throw new InvalidBillingPlanUpdateException(
          "plano precisa ter pelo menos um intervalo ativo enquanto estiver ativo",
        );
      }
    }

    const updatedPrice = await this.billingPlanPriceRepo.updateById(
      price.id,
      { active },
    );

    await this.auditService.logByAuthId(actorAuthId, {
      action: "subscription_changed",
      entityType: "billing_plan_price",
      entityId: updatedPrice.id,
      metadata: {
        operation: "toggle_interval_price",
        planKey,
        interval,
        active,
      },
    });

    // Best-effort — a mudança já foi concluída localmente; nunca falha nem
    // atrasa o retorno por causa de uma revalidação de cache do frontend
    // (habilitar/desabilitar um intervalo muda o que a vitrine mostra).
    await this.revalidationClient.revalidate("/");

    return updatedPrice;
  }
}
