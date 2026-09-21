import { Inject, Injectable } from "@nestjs/common";
import {
  IMemberPaymentRepository,
  MEMBER_PAYMENT_REPOSITORY,
} from "../../domain/member-payment.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { resolveActor } from "./resolve-actor";

export interface GetMemberPaymentSummaryInput {
  orgId: string;
  authId: string;
  /** Membro cujo saldo devido sera calculado — vem da rota, nao do body. */
  targetUserId: string;
}

export interface MemberPaymentSummary {
  accruedCommissionCents: number;
  paidNetCents: number;
  balanceDueCents: number;
  /** Receita bruta dos servicos pagos e nao cancelados do membro (vitalicio). */
  grossRevenueCents: number;
  /** Taxas retidas (snapshot da transacao de pagamento) nesses servicos. */
  feesCents: number;
  /** Liquido do estudio = bruta - taxas - comissao acumulada (pode ser < 0). */
  studioNetCents: number;
  /** Custo do material consumido nos servicos nao cancelados do membro. */
  materialCostCents: number;
}

@Injectable()
export class GetMemberPaymentSummaryUseCase {
  constructor(
    @Inject(MEMBER_PAYMENT_REPOSITORY)
    private readonly memberPaymentRepo: IMemberPaymentRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
  ) {}

  async execute(
    input: GetMemberPaymentSummaryInput,
  ): Promise<MemberPaymentSummary> {
    const { userId: currentUserId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    if (!isOwner && input.targetUserId !== currentUserId) {
      throw new CashierForbiddenException();
    }

    // Saldo devido e VITALICIO (confirmacao CP1, plano do Bloco 2) — from/to
    // cobrem todo o historico. period_start/period_end das linhas de
    // pagamento NUNCA entram aqui. performedBy e SEMPRE o targetUserId
    // resolvido, nunca null: `null` agregaria a comissao da ORG INTEIRA
    // (doc-comment em service.repository.interface.ts) e vazaria a comissao
    // de todos os membros para qualquer leitor deste endpoint.
    // Mesmo escopo temporal e mesmo performedBy para os totais de servico:
    // bruta/taxas/material vem dos snapshots persistidos (nada recalculado).
    const from = new Date(0);
    const to = new Date();
    const [accruedCommissionCents, paidNetCents, totals] = await Promise.all([
      this.serviceRepo.commissionCentsByPeriod(
        input.orgId,
        from,
        to,
        input.targetUserId,
      ),
      this.memberPaymentRepo.netPaidCents(input.orgId, input.targetUserId),
      this.serviceRepo.memberTotalsByPeriod(
        input.orgId,
        from,
        to,
        input.targetUserId,
      ),
    ]);

    return {
      accruedCommissionCents,
      paidNetCents,
      balanceDueCents: Math.max(0, accruedCommissionCents - paidNetCents),
      grossRevenueCents: totals.grossRevenueCents,
      feesCents: totals.feesCents,
      studioNetCents:
        totals.grossRevenueCents - totals.feesCents - accruedCommissionCents,
      materialCostCents: totals.materialCostCents,
    };
  }
}
